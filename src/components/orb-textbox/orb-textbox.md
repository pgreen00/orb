---
title: "OrbTextbox | <orb-textbox>"
sidebar_label: "Textbox"
---

## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage
## Usage

::: live-code-demo

```html
<orb-stack>
  <orb-textbox type="phone" value="2705569657">
    <orb-label slot="label">Phone number</orb-label>
  </orb-textbox>
  <orb-textbox required placeholder="Type your name..." label="Full Name"></orb-textbox>
  <orb-textbox type="password" label="Password"></orb-textbox>
  <orb-textbox type="money" label="Money"></orb-textbox>
  <orb-textbox type="ssn" label="SSN"></orb-textbox>
  <orb-textbox type="number" label="Number"></orb-textbox>
  <orb-textbox type="time" label="Time"></orb-textbox>
  <orb-textbox type="date" label="Date"></orb-textbox>
  <orb-textbox type="datetime" label="Date & Time"></orb-textbox>
  <orb-textbox type="daterange" label="Date Range"></orb-textbox>
  <orb-textbox type="email" label="Email"></orb-textbox>
  <orb-textbox type="url" label="URL"></orb-textbox>
</orb-stack>  
```

:::

::: live-code-demo

```html
<form id="test-form">
  <orb-stack>
    <orb-textbox name="firstName" required placeholder="Type your name..." label="First Name"></orb-textbox>
    <orb-textbox name="lastName" required placeholder="Type your name..." label="Last Name"></orb-textbox>
    <label>
      <span>Are you under 18?</span>
      <input type="checkbox" required name="isMinor"/>
    </label>
    <orb-stack>
      <orb-label>Colors</orb-label>
      <label>
        <span>Red</span>
        <input type="checkbox" name="colors[]" value="red"/>
      </label>
      <label>
        <span>Blue</span>
        <input type="checkbox" name="colors[]" value="blue"/>
      </label>
      <label>
        <span>Green</span>
        <input type="checkbox" name="colors[]" value="green"/>
      </label>
    </orb-stack>
    <button type="submit">Submit</button>
  </orb-stack>  
</form>
```

```javascript
const form = document.querySelector('#test-form')
form.addEventListener('submit', ev => {
  ev.preventDefault()
  console.log(Array.from(ev.target.elements))
  const formData = new FormData(form)
  for (const [key, value] of formData.entries()) 
    console.log(key, value)
})
form.addEventListener('invalid', console.log, {capture:true})
```

:::
