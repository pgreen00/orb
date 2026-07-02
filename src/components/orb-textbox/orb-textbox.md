---
title: "JeTextbox | <je-textbox>"
sidebar_label: "Textbox"
---

## Usage

::: live-code-demo

```html
<je-stack>
  <je-textbox type="phone" value="2705569657">
    <je-label slot="label">Phone number</je-label>
  </je-textbox>
  <je-textbox required placeholder="Type your name..." label="Full Name"></je-textbox>
  <je-textbox type="password" label="Password"></je-textbox>
  <je-textbox type="money" label="Money"></je-textbox>
  <je-textbox type="ssn" label="SSN"></je-textbox>
  <je-textbox type="number" label="Number"></je-textbox>
  <je-textbox type="time" label="Time"></je-textbox>
  <je-textbox type="date" label="Date"></je-textbox>
  <je-textbox type="datetime" label="Date & Time"></je-textbox>
  <je-textbox type="daterange" label="Date Range"></je-textbox>
  <je-textbox type="email" label="Email"></je-textbox>
  <je-textbox type="url" label="URL"></je-textbox>
</je-stack>  
```

:::

::: live-code-demo

```html
<form id="test-form">
  <je-stack>
    <je-textbox name="firstName" required placeholder="Type your name..." label="First Name"></je-textbox>
    <je-textbox name="lastName" required placeholder="Type your name..." label="Last Name"></je-textbox>
    <label>
      <span>Are you under 18?</span>
      <input type="checkbox" required name="isMinor"/>
    </label>
    <je-stack>
      <je-label>Colors</je-label>
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
    </je-stack>
    <button type="submit">Submit</button>
  </je-stack>  
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
