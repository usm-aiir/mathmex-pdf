"""
Utility mappings for LaTeX to spoken math conversion.
These convert unicode symbols (output by pylatexenc) to natural language.
"""

# Greek letters: unicode → spoken
GREEK_TO_SPOKEN = {
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta',
    'ε': 'epsilon', 'ζ': 'zeta', 'η': 'eta', 'θ': 'theta',
    'ι': 'iota', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu',
    'ν': 'nu', 'ξ': 'xi', 'π': 'pi', 'ρ': 'rho',
    'σ': 'sigma', 'τ': 'tau', 'υ': 'upsilon', 'φ': 'phi',
    'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
    # Uppercase
    'Γ': 'Gamma', 'Δ': 'Delta', 'Θ': 'Theta', 'Λ': 'Lambda',
    'Ξ': 'Xi', 'Π': 'Pi', 'Σ': 'Sigma', 'Υ': 'Upsilon',
    'Φ': 'Phi', 'Ψ': 'Psi', 'Ω': 'Omega',
    # Variants
    'ϵ': 'epsilon', 'ϑ': 'theta', 'ϖ': 'pi', 'ϱ': 'rho',
    'ς': 'sigma', 'ϕ': 'phi',
}

# Math symbols: unicode → spoken
SYMBOLS_TO_SPOKEN = {
    # Operators
    '·': ' times ', '×': ' times ', '÷': ' divided by ',
    '±': ' plus or minus ', '∓': ' minus or plus ',
    # Relations
    '≤': ' less than or equal to ', '≥': ' greater than or equal to ',
    '≠': ' not equal to ', '≈': ' approximately ',
    '∼': ' similar to ', '≡': ' equivalent to ',
    '∝': ' proportional to ',
    # Set operations
    '∈': ' in ', '∉': ' not in ', '⊂': ' subset of ', '⊃': ' superset of ',
    '∪': ' union ', '∩': ' intersection ', '∅': ' empty set ',
    # Logic
    '∀': ' for all ', '∃': ' there exists ', '¬': ' not ',
    '∧': ' and ', '∨': ' or ',
    # Arrows
    '→': ' arrow ', '←': ' arrow ', '⇒': ' implies ', '⇐': ' is implied by ',
    '↔': ' if and only if ', '↦': ' maps to ',
    # Calculus
    '∂': ' partial ', '∇': ' del ', '∞': ' infinity ',
    '∑': ' the sum of ', '∏': ' the product of ', '∫': ' the integral of ',
    # Other
    '…': ' and so on ', '⋯': ' and so on ', '′': ' prime ',
    '∘': ' composed with ', '⊕': ' direct sum ', '⊗': ' tensor product ',
    'ℓ': ' L ', 'ℏ': ' h bar ',
    # Script/fancy letters (from \mathcal, etc.)
    'ℱ': 'F', 'ℒ': 'L', 'ℋ': 'H', 'ℛ': 'R', 'ℬ': 'B',
    'ℰ': 'E', 'ℳ': 'M', 'ℕ': 'N', 'ℤ': 'Z', 'ℚ': 'Q', 'ℝ': 'R', 'ℂ': 'C',
}

# Superscript digits: unicode → spoken  
SUPERSCRIPTS = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
    'ⁿ': 'n', 'ⁱ': 'i',
}

# Subscript digits: unicode → spoken
SUBSCRIPTS = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
    'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ᵢ': 'i', 'ⱼ': 'j',
    'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₚ': 'p', 'ₛ': 's', 'ₜ': 't',
}

def convert_latex_to_spoken(latex: str, latex2text: any) -> str:
    """Convert LaTeX to spoken natural language using pylatexenc."""
    if not latex or not latex.strip():
        return ""
    
    try:
        # Strip math delimiters
        clean = re.sub(r'^\$+|\$+$', '', latex.strip())
        clean = re.sub(r'^\\[\[\(]|\\[\]\)]$', '', clean)
        
        # Convert LaTeX to unicode text
        text = latex2text.latex_to_text(clean)
        
        # Replace unicode symbols with spoken words
        for symbol, spoken in {**GREEK_TO_SPOKEN, **SYMBOLS_TO_SPOKEN}.items():
            text = text.replace(symbol, f' {spoken} ')
        
        # Convert unicode super/subscripts to ASCII
        for sup, char in SUPERSCRIPTS.items():
            text = text.replace(sup, f'^{char}')
        for sub, char in SUBSCRIPTS.items():
            text = text.replace(sub, f'_{char}')
        
        # Handle powers: x^2 -> x squared, x^n -> x to the power of n
        def speak_power(m):
            base, exp = m.group(1), m.group(2).strip('{}')
            if exp == '2': return f'{base} squared'
            if exp == '3': return f'{base} cubed'
            if exp == 'T': return f'{base} transpose'
            if exp == '-1': return f'{base} inverse'
            return f'{base} to the power of {exp}'
        text = re.sub(r'(\w)\^(\{[^}]+\}|[0-9a-zA-Z\-]+)', speak_power, text)
        
        # Handle subscripts: x_i -> x sub i
        text = re.sub(r'(\w)_(\{[^}]+\}|[0-9a-zA-Z]+)',
                      lambda m: f"{m.group(1)} sub {m.group(2).strip('{}')}", text)
        
        # Basic operators
        text = text.replace('+', ' plus ').replace('=', ' equals ')
        text = text.replace('<', ' less than ').replace('>', ' greater than ')
        text = re.sub(r'(?<=[a-zA-Z\s])-(?=[a-zA-Z\s])', ' minus ', text)
        
        # Fractions and Big-O
        text = re.sub(r'(\w+)/(\w+)', r'\1 over \2', text)
        text = re.sub(r'O\s*\(([^)]+)\)', r'O of \1', text)
        
        # Parentheses
        text = re.sub(r'\(', ' of ', text)
        text = re.sub(r'\)', ' ', text)
        
        # Clean up and capitalize
        text = re.sub(r'\s+', ' ', text).strip()
        return text[0].upper() + text[1:] if text else f"Formula: {latex}"
    
    except Exception as e:
        logging.error(f"Error converting LaTeX: {e}")
        return f"Formula: {latex}"
