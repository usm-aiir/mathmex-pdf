import logging

from fastapi.concurrency import asynccontextmanager

# Configure logging to display INFO level messages
logging.basicConfig(level=logging.INFO)

# Log an informational message indicating the API is starting
logging.info("Starting the PDF Math Parser API...")

# Import FastAPI for building the web API
from fastapi import FastAPI
# Import CORSMiddleware for handling Cross-Origin Resource Sharing
from fastapi.middleware.cors import CORSMiddleware

import httpx
# Create an asynchronous HTTP client using httpx
client = httpx.AsyncClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Clean up resources here
    await client.aclose()

# Create a FastAPI application instance with debug mode enabled
app = FastAPI(debug=True, lifespan=lifespan)
# Add CORS middleware to allow requests from specific origins
app.add_middleware(
    CORSMiddleware,
    # Allow requests from localhost:3000 and localhost:5173 (common frontend development servers)
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,  # Allow credentials (e.g., cookies, HTTP authentication)
    allow_methods=["*"],     # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],     # Allow all HTTP headers
)

# Define a root endpoint for the API
@app.get("/pdf_reader/api/")
def read_root():
    """
    Root endpoint that returns a welcome message.
    """
    return {"message": "Welcome to the PDF Math Parser API!"}

# Import necessary modules for document layout analysis and image processing
from doclayout_yolo.engine.results import Results
import requests
from pdf2image import convert_from_bytes
from typing import NamedTuple

# Define a NamedTuple to represent a PDF math formula with its page, formula string, and bounding box
class PDFMathFormula(NamedTuple):
    page: int
    formula: str | None
    bbox: list[float]

# Import lru_cache for memoization (caching function results)
from functools import lru_cache

# Import Image from PIL (Pillow) for image manipulation
from PIL import Image

def convert_pdf_to_images(pdf_bytes: bytes) -> list[Image.Image]:
    """
    Convert the PDF bytes to a list of PIL Image objects.
    """
    logging.info("Converting PDF bytes to images...")
    # Convert PDF bytes to images using pdf2image, with a DPI of 300 for better quality
    images = convert_from_bytes(pdf_bytes, dpi=300)
    print(f"Converted PDF to {len(images)} images.")
    print(f"Image sizes: {[image.size for image in images]}")
    # Raise an error if no images are converted
    if not images:
        raise ValueError("Failed to convert PDF to images.")
    return images

@lru_cache(maxsize=32)
def get_pdf_images(pdf_url: str) -> list[Image.Image]:
    """
    Get the images of the PDF file given its URL.
    This function caches the results to avoid repeated downloads and processing.
    """
    logging.info(f"Getting PDF images for URL: {pdf_url}")
    # Download the PDF and then convert it to images
    pdf_bytes = download_pdf(pdf_url)
    images = convert_pdf_to_images(pdf_bytes)
    return images

from pdf2image import convert_from_bytes

def get_pdf_page_image(pdf_url: str, page_num: int) -> Image.Image:
    pdf_bytes = download_pdf(pdf_url)
    images = convert_from_bytes(
        pdf_bytes,
        dpi=300,
        first_page=page_num,
        last_page=page_num
    )
    return images[0]

@lru_cache(maxsize=64)  # 64 pages total across all PDFs
def get_cached_page(pdf_url: str, page_num: int):
    return get_pdf_page_image(pdf_url, page_num)

# Import MathFormulaDetector for detecting formulas
from pix2text import MathFormulaDetector

# Initialize the MathFormulaDetector model
math_detector = MathFormulaDetector()
# Set a minimum score for detected math formulas to be considered valid
min_score = 0.75

def get_bounding_boxes(images: list) -> list[PDFMathFormula]:
    """
    Analyze the images and extract math formulas by detecting their bounding boxes
    using the MathFormulaDetector.
    """
    formulas = []
    for i, image in enumerate(images):
        # Detect math formulas in the current image
        results = math_detector.detect(image)
        if not results:
            continue
        for result in results:
            # Check if the result is a dictionary and contains 'box' and 'score'
            if isinstance(result, dict) and 'box' in result and 'score' in result:
                # If the detection score meets the minimum requirement
                if result['score'] >= min_score:
                    # Normalize bounding box coordinates to be between 0 and 1
                    bbox = [
                        result['box'][0][0] / image.width,
                        result['box'][0][1] / image.height,
                        result['box'][2][0] / image.width,
                        result['box'][2][1] / image.height,
                    ]
                    # Append the detected formula's information (page and normalized bbox)
                    formulas.append(PDFMathFormula(page=i + 1, formula=None, bbox=bbox))
        print(results)  # Print detection results (for debugging)
    return formulas

# Import Response from FastAPI for returning file content
from fastapi.responses import Response

@app.get("/pdf_reader/api/get_pdf/{pdf_url:path}")
async def get_pdf(pdf_url: str):
    """
    Endpoint to get the PDF file from a given URL.
    Returns the PDF content as a file download.
    """
    logging.info(f"Received request to get PDF from URL: {pdf_url}")
    try:
        pdf_url = resolve_pdf_path(pdf_url)
        # Download the PDF bytes
        pdf_bytes = download_pdf(pdf_url)
        # Return the PDF bytes with the appropriate media type
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        logging.error(f"Error downloading PDF: {e}")
        return {"error": str(e)}

# Import json module
import json

from functools import lru_cache

@lru_cache(maxsize=256)  # Cache per-page results (adjust maxsize as needed)
def get_pdf_page_regions(pdf_url: str, page_num: int) -> list[PDFMathFormula]:
    """
    Get the bounding boxes of math formulas for a single page of a PDF.
    Returns a list of PDFMathFormula for that page.
    """
    logging.info(f"Processing PDF {pdf_url}, page {page_num}")
    pdf_url = resolve_pdf_path(pdf_url)
    
    # Convert just this page to an image
    from pdf2image import convert_from_bytes
    pdf_bytes = download_pdf(pdf_url)
    image = convert_from_bytes(pdf_bytes, dpi=300, first_page=page_num, last_page=page_num)[0]

    # Detect formulas in this single page
    formulas = []
    results = math_detector.detect(image)
    if results:
        for result in results:
            if isinstance(result, dict) and 'box' in result and 'score' in result:
                if result['score'] >= min_score:
                    bbox = [
                        result['box'][0][0] / image.width,
                        result['box'][0][1] / image.height,
                        result['box'][2][0] / image.width,
                        result['box'][2][1] / image.height,
                    ]
                    formulas.append(PDFMathFormula(page=page_num, formula=None, bbox=bbox))
    return formulas


def get_pdf_regions(pdf_url: str) -> list[dict]:
    """
    Process the PDF page by page, returning all detected formula regions.
    This avoids loading the entire PDF into memory at once.
    """
    logging.info(f"Getting PDF regions for URL: {pdf_url}")
    pdf_url = resolve_pdf_path(pdf_url)
    # First, figure out how many pages we have
    pdf_bytes = download_pdf(pdf_url)
    from pdf2image import pdfinfo_from_bytes
    info = pdfinfo_from_bytes(pdf_bytes)
    num_pages = info['Pages']

    all_formulas = []

    # Process each page one at a time
    for page_num in range(1, num_pages + 1):
        page_formulas = get_pdf_page_regions(pdf_url, page_num)
        all_formulas.extend(page_formulas)

    # Enumerate results for front-end
    enumerated_bboxes = [
        {"bbox": f.bbox, "pagenum": f.page, "id": i} for i, f in enumerate(all_formulas)
    ]

    return enumerated_bboxes


@app.get("/pdf_reader/api/predict_math_regions/{pdf_url:path}")
async def predict_math_regions(pdf_url: str):
    """
    Endpoint to predict math formulas (their bounding box regions) in a PDF file given its URL.
    """
    logging.info(f"Received request to predict math regions for PDF URL: {pdf_url}")
    try:
        pdf_url = resolve_pdf_path(pdf_url)
        # Get the predicted math regions
        regions = get_pdf_regions(pdf_url)
        if not regions:
            return {"message": "No math formulas found in the PDF."}
        # Log information about each detected region
        for region in regions:
            logging.info(f"Region ID: {region['id']}, Page: {region['pagenum']}, BBox: {region['bbox']}")
        return {"regions": regions}
    except Exception as e:
        logging.error(f"Error processing PDF: {e}")
        return {"error": str(e)}

from pix2text import Pix2Text
# Initialize the full pipeline (Detector + Recognizer)
# This replaces both 'latex_model' and 'math_detector'
p2t = Pix2Text.from_config()

@lru_cache(maxsize=2048)
def get_pdf_latex(pdf_url: str, latex_id: int) -> dict:
    """
    Get the LaTeX representation of a specific math region in a PDF file.
    This function caches the results to avoid repeated downloads and processing.
    """
    logging.info(f"Getting LaTeX for region {latex_id} in PDF URL: {pdf_url}")
    # Get all math regions for the given PDF
    regions = get_pdf_regions(pdf_url)
    
    # Validate the provided region ID
    if latex_id < 0 or latex_id >= len(regions):
        raise ValueError(f"Invalid region ID: {latex_id}. Must be between 0 and {len(regions) - 1}.")
    
    # Get the bounding box for the specified region ID
    bbox = regions[latex_id]
    # Get the images of the PDF
    # images = get_pdf_images(pdf_url)
    
    # # Extract the specific page image where the formula is located
    # page_image = images[bbox['pagenum'] - 1]

    page_image = get_cached_page(pdf_url, bbox["pagenum"])


    # Convert normalized bounding box coordinates to pixel values
    x1, y1, x2, y2 = bbox['bbox']
    width, height = page_image.size
    x1, y1, x2, y2 = int(x1 * width), int(y1 * height), int(x2 * width), int(y2 * height)
    # Crop the image to isolate the math formula
    image = page_image.crop((x1, y1, x2, y2))
    logging.info(f"Extracted image for region {latex_id} with size: {image.size}")


    try:
        # resized_shape uses a larger default (768) which preserves details
        latex = p2t.recognize_formula(image) 
    except Exception as e:
        logging.error(f"P2T Recognition failed: {e}")
        latex = ""


    return {"latex": latex}

@app.get("/pdf_reader/api/get_latex_for_region/{region_id:int}/{pdf_url:path}")
async def get_latex_for_region(region_id: int, pdf_url: str):
    """
    Endpoint to get the LaTeX representation of a specific math region in a PDF.
    """
    logging.info(f"Received request to get LaTeX for region {region_id} in PDF URL: {pdf_url}")
    try:
        pdf_url = resolve_pdf_path(pdf_url)
        # Get the LaTeX data for the specified region
        latex_data = get_pdf_latex(pdf_url, region_id)
        if "latex" not in latex_data:
            return {"message": "No LaTeX found for the specified region."}
        return latex_data
    except Exception as e:
        logging.error(f"Error processing region: {e}")
        # Return error details, including the exception class name and message
        return {"error": e.__class__.__name__, "message": str(e)}

@app.get("/pdf_reader/api/simple_test")
def simple_test():
    """
    A simple test endpoint to verify the API is running.
    """
    logging.info("DEBUG: Simple test endpoint hit successfully.")
    return {"message": "Hello from simple test!"}

from fastapi import Request
from fastapi.responses import StreamingResponse, JSONResponse

mathmex_api = "https://mathmex.com/api"

@app.post("/pdf_reader/api/fusion-search")
async def fusion_search_proxy(request: Request):
    """
    Search endpoint that forwards the request to the MathMex API fusion-search endpoint.
    """
    try:
        logging.info(f"Fusion search endpoint called")
        request_body = await request.json()
        logging.info(f"Request body: {request_body}")
        
        forward_headers = {
            key: value for key, value in request.headers.items()
            if key.lower() not in ["host", "accept-encoding", "user-agent", "content-length"]
        }
        forward_headers["Content-Type"] = "application/json"
        
        logging.info(f"Forwarding to: {mathmex_api}/fusion-search")
        mathmex_response = await client.post(
                f"{mathmex_api}/fusion-search",
                json=request_body,
                headers=forward_headers,
                timeout=30.0
            )
        
        logging.info(f"MathMex response status: {mathmex_response.status_code}")
        
        # If MathMex returns an error status, parse and return the JSON error response
        if mathmex_response.status_code >= 400:
            error_data = mathmex_response.json()
            logging.error(f"MathMex returned error: {error_data}")
            return JSONResponse(
                content={"error": error_data.get("error", "Unknown error"), "results": [], "total": 0},
                status_code=mathmex_response.status_code
            )

        # For successful responses, stream the content back
        async def generate_response_chunks():
                async for chunk in mathmex_response.aiter_bytes():
                    yield chunk

        response_headers = {
            key: value for key, value in mathmex_response.headers.items()
            if key.lower() not in ["content-encoding", "transfer-encoding", "connection"]
        }
        # Remove CORS headers - let our middleware handle them
        response_headers.pop("access-control-allow-origin", None)
        response_headers.pop("access-control-allow-methods", None)
        response_headers.pop("access-control-allow-headers", None)

        return StreamingResponse(
            generate_response_chunks(),
            status_code=mathmex_response.status_code,
            headers=response_headers,
            media_type=mathmex_response.headers.get("Content-Type")
        )
    except Exception as e:
        logging.error(f"Error in fusion search endpoint: {str(e)}")
        logging.error(f"Exception type: {type(e).__name__}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            content={"error": str(e), "results": [], "total": 0},
            status_code=500
        )
    


import os 
from pathlib import Path
import uuid
import shutil
from fastapi import UploadFile, File
import time

UPLOAD_DIR = Path("/tmp/uploaded_pdfs")
UPLOAD_DIR.mkdir(exist_ok=True)

# Helper to check if a string is a URL
def is_url(string: str) -> bool:
    return string.startswith("http://") or string.startswith("https://")

def resolve_pdf_path(pdf_url: str) -> str:
    """
    Resolves a PDF identifier to a concrete location.
    - If it's 'local://<id>', it returns the absolute file system path.
    - If it's a web URL, it returns it as is.
    """
    if pdf_url.startswith("local://"):
        # Strip the prefix to get the UUID
        pdf_id = pdf_url.replace("local://", "")
        # Return the actual file path on the server
        return str(UPLOAD_DIR / f"{pdf_id}.pdf")
    return pdf_url

@lru_cache(maxsize=32)
def download_pdf(pdf_url: str) -> bytes:
    """
    Acquire PDF bytes. 
    - If path is a local file, read from disk.
    - If path is a URL, download it.
    """
    
    if os.path.exists(pdf_url) and not is_url(pdf_url):
        logging.info(f"Reading local PDF from disk: {pdf_url}")
        with open(pdf_url, "rb") as f:
            return f.read()
    
    logging.info(f"Downloading PDF from URL: {pdf_url}")
    response = requests.get(pdf_url)
    if response.status_code != 200:
        raise ValueError("Failed to download PDF from the provided URL.")
    return response.content

@app.post("/pdf_reader/api/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    
    cleanup_old_files(UPLOAD_DIR, max_age_seconds=3600) # 1 hour retention

    # Generate a unique ID (UUID)
    pdf_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{pdf_id}.pdf"

    # Stream the uploaded file to disk
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    logging.info(f"File uploaded and saved to {save_path}")

    # Return a custom internal URI instead of a localhost URL
    return {"pdf_url": f"local://{pdf_id}"}


def cleanup_old_files(folder: Path, max_age_seconds: int = 3600):
    """
    Deletes files in the folder that are older than max_age_seconds (default 1 hour).
    """
    current_time = time.time()
    for file_path in folder.glob("*.pdf"):
        try:
            # Check file modification time
            if current_time - file_path.stat().st_mtime > max_age_seconds:
                file_path.unlink()  # Delete the file
                logging.info(f"Deleted old file: {file_path}")
        except Exception as e:
            logging.error(f"Error deleting file {file_path}: {e}")

# This context manager is used to manage the lifespan of the FastAPI application

# Ensure the FastAPI application runs when this script is executed directly
# This is useful for development and testing purposes
# It allows running the API server without needing to use an external server like Uvicorn or

if __name__ == "__main__":
    import uvicorn
    # Run the FastAPI application using Uvicorn on port 9095
    uvicorn.run(app, host="0.0.0.0", port=9095)
