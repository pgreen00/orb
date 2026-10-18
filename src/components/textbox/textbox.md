---
title: "OrbTextbox | <orb-textbox>"
sidebar_label: "Textbox"
---

## Usage

::: live-code-demo

```html
<orb-stack>
  <orb-textbox>
    <orb-label>Phone number</orb-label>
    <input required type="tel" value="2705569657"/>
    <orb-note>Include area code</orb-note>
  </orb-textbox>
  <orb-textbox label="Full Name">
    <input required placeholder="Type your name..."/>
  </orb-textbox>
  <orb-textbox label="Password">
    <input type="password"/>
  </orb-textbox>
  <orb-textbox label="Money">
    <input type="money"/>
  </orb-textbox>
  <orb-textbox label="SSN">
    <input type="ssn"/>
  </orb-textbox>
  <orb-textbox label="Number">
    <input type="number"/>
  </orb-textbox>
  <orb-textbox label="Time">
    <input type="time"/>
  </orb-textbox>
  <orb-textbox label="Date">
    <input type="date"/>
  </orb-textbox>
  <orb-textbox label="Email">
    <input type="email"/>
  </orb-textbox>
  <orb-textbox label="URL">
    <input type="url"/>
  </orb-textbox>
  <orb-textbox>
    <orb-label>Food</orb-label>
    <select name="select-input">
      <option hidden></option>
      <optgroup label="Fruits">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
      </optgroup>
      <optgroup label="Vegetables">
        <option value="carrot">Carrot</option>
        <option value="pea">Pea</option>
      </optgroup>
    </select>
  </orb-textbox>
  <orb-textbox>
    <orb-label>With datalist</orb-label>
    <input name="list-input" list="food-list">
  </orb-textbox>
  <datalist id="food-list">
    <option value="Cherry"/>
    <optgroup label="Fruits">
      <option>Apple</option>
      <option>Banana</option>
    </optgroup>
    <optgroup label="Vegetables">
      <option>Carrot</option>
      <option>Pea</option>
    </optgroup>
  </datalist>
  <orb-textbox label="Message">
    <textarea placeholder="Notes"></textarea>
    <orb-button slot="after" class="icon-only">
      <iconify-icon icon="mdi:send"></iconify-icon>
    </orb-button>
  </orb-textbox>
</orb-stack>  
```

:::
