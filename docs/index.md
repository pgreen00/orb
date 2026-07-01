## Welcome to Jebamo

<div class="textbox-container">
  <style>
    @scope {
      :scope {
        position: relative;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 0.5rem;
        &:focus-within {
          border-color: #0066cc;
          outline: 2px solid #0066cc;
        }
      }
      .inline-label {
        font-size: 0.75rem;
        color: #666;
        display: block;
        margin-bottom: 0.25rem;
      }
      .inline-input {
        border: none;
        outline: none;
        width: 100%;
        font-size: 1rem;
      }
    }
  </style>
  <label for="username" class="inline-label">Username</label>
  <input 
    type="text" 
    id="username" 
    class="inline-input"
    placeholder=" "
  />
</div>

<div class="je-elevation-md je-radius-md">
  <style>
    @scope {
      #ce {
        padding: 0.5rem;
        background-color: transparent;
        color: inherit;
      }
      :scope {
        background-color: canvas;
        color: canvastext;
        border: solid 1px var(--je-neutral-500);
        overflow: hidden;
        box-sizing: border-box;
      }
    }
  </style>
  <div contenteditable="plaintext-only" id="ce"></div>
</div>
<input id="phone" placeholder="phone" /><br/>
<input id="currency" placeholder="currency" /><br/>
<input id="custom" placeholder="alphanumeric" /><br/>
<input id="credit-card" placeholder="cc" /><br/>
<input id="date" placeholder="date" /><br/>
<input id="ssn" placeholder="ssn" />

<select>
  <optgroup label="Theropods">
    <option>Tyrannosaurus</option>
    <option>Velociraptor</option>
    <option>Deinonychus</option>
  </optgroup>
  <optgroup label="Sauropods">
    <option>Diplodocus</option>
    <option>Saltasaurus</option>
    <option>Apatosaurus</option>
  </optgroup>
</select>

<label for="ice-cream-choice">Choose a flavor:</label>
<input list="ice-cream-flavors" id="ice-cream-choice" name="ice-cream-choice" />

<datalist id="ice-cream-flavors">
  <option value="Chocolate"></option>
  <option value="Coconut"></option>
  <option value="Mint"></option>
  <option value="Strawberry"></option>
  <option value="Vanilla"></option>
</datalist>


<je-card>
  Hey
  <je-card>yoyoyoyoyo</je-card>
  <span><je-button>hey</je-button></span>
</je-card>

<script type="module">
import {InputMask} from './build/jebamo/dist/index.js'

// Example 1: Phone Number Masking (US format)
const phoneFormatter = (value) => {
  const digits = value.substring(0, 10); // Already extracted, just limit length

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const phoneMask = new InputMask({
  inputElement: document.getElementById("ce"),
  formatter: phoneFormatter,
  extractor: (val) => val.replace(/\D/g, ""),
});

// Example 2: Credit Card Masking
const creditCardFormatter = (value) => {
  const digits = value.substring(0, 16);
  return digits.match(/.{1,4}/g)?.join(" ") || digits;
};

const ccMask = new InputMask({
  inputElement: document.getElementById("credit-card"),
  formatter: creditCardFormatter,
  extractor: (val) => val.replace(/\D/g, ""),
});

// Example 3: Date Masking (MM/DD/YYYY)
const dateFormatter = (value) => {
  const digits = value.substring(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const dateMask = new InputMask({
  inputElement: document.getElementById("date"),
  formatter: dateFormatter,
  extractor: (val) => val.replace(/\D/g, ""),
});

// Example 4: Currency Masking
const currencyFormatter = (value) => {
  const digits = value;
  if (!digits) return "";

  const number = parseInt(digits, 10) / 100;
  return (
    "$" +
    number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const currencyMask = new InputMask({
  inputElement: document.getElementById("currency"),
  formatter: currencyFormatter,
  extractor: (val) => val.replace(/\D/g, ""),
});

// Example 5: Social Security Number
const ssnFormatter = (value) => {
  const digits = value.substring(0, 9);
  
  if (digits.length === 0) return '';
  
  let formatted = '';
  
  // First section (0-3 digits) - always masked
  const firstSection = digits.slice(0, 3);
  formatted += firstSection.replace(/\d/g, 'X');
  
  // Second section (4-5 digits) - always masked
  if (digits.length > 3) {
    const secondSection = digits.slice(3, 5);
    formatted += '-' + secondSection.replace(/\d/g, 'X');
  }
  
  // Third section (6-9 digits) - visible
  if (digits.length > 5) {
    formatted += '-' + digits.slice(5, 9);
  }
  
  return formatted;
};

const ssnMask = new InputMask({
  inputElement: document.getElementById('ssn'),
  formatter: raw => {
    // Format as XXX-XX-XXXX
    const digits = raw.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  },
  extractor: formatted => formatted.replace(/\D/g, ''),
  masker: (rawValue, formattedValue) => {
    if (rawValue.length <= 5) {
      // Mask everything
      return formattedValue.replace(/\d/g, 'X');
    }
    
    // Mask first 5 digits, show everything after
    let digitCount = 0;
    return formattedValue.split('').map(char => {
      if (/\d/.test(char)) {
        digitCount++;
        return digitCount <= 5 ? 'X' : char;
      }
      return char;
    }).join('');
  }
});

// Example 6: Custom Alpha-Numeric Format (ABC-123)
const customFormatter = (value) => {
  const clean = value.toUpperCase().substring(0, 6);

  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
};

const customMask = new InputMask({
  inputElement: document.getElementById("custom"),
  formatter: customFormatter,
  extractor: (val) => val.replace(/[^A-Z0-9]/gi, ""),
});
</script>
