---
title: "JeTable | <je-table>"
sidebar_label: "Table"
---

## Usage

<je-table id="da-table">
  <je-tr type="header">
    <je-tc sticky>
      <je-table-filter type="text">ID</je-table-filter>
    </je-tc>
    <je-tc>Name</je-tc>
    <je-tc>Department</je-tc>
    <je-tc>Position</je-tc>
    <je-tc>Salary</je-tc>
    <je-tc>Status</je-tc>
  </je-tr>
  <template>
    <je-tr>
      <je-tc copy sticky></je-tc>
      <je-tc></je-tc>
      <je-tc></je-tc>
      <je-tc></je-tc>
      <je-tc></je-tc>
      <je-tc></je-tc>
    </je-tr>
  </template>
  <je-tr type="footer">
    <je-tc col-span="6">
      <je-toolbar>
        <span slot="end">1 to 10 of 83</span>
        <je-stack mode="row" space="none" slot="end">
          <je-button fill="clear" class="icon-only">
            <je-icon>first_page</je-icon>
          </je-button>
          <je-button fill="clear" class="icon-only">
            <je-icon>chevron_left</je-icon>
          </je-button>
          <span>Page 1 of 9</span>
          <je-button fill="clear" class="icon-only">
            <je-icon>chevron_right</je-icon>
          </je-button>
          <je-button fill="clear" class="icon-only">
            <je-icon>last_page</je-icon>
          </je-button>
        </je-stack>
      </je-toolbar>
    </je-tc>
  </je-tr>
</je-table>

<script type="module">
const employees = await fetch('/employees.json').then(t => t.json());
await customElements.whenDefined('je-table')
document.querySelector('#da-table').data = employees
</script>

<je-table>
  <je-tr type="header">
    <je-tc sticky>
      <je-table-filter type="text">ID</je-table-filter>
    </je-tc>
    <je-tc>Name</je-tc>
    <je-tc>Department</je-tc>
    <je-tc>Position</je-tc>
    <je-tc>Salary</je-tc>
    <je-tc>Status</je-tc>
  </je-tr>
  <je-tr>
    <je-tc row-span="2" copy sticky>001</je-tc>
    <je-tc>Alice Johnson</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Senior Developer</je-tc>
    <je-tc>$95,000</je-tc>
    <je-tc>Active</je-tc>
    <je-tc>Bob Smith</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Marketing Manager</je-tc>
    <je-tc>$85,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>003</je-tc>
    <je-tc>Carol White</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>HR Specialist</je-tc>
    <je-tc>$65,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>004</je-tc>
    <je-tc>David Brown</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>DevOps Engineer</je-tc>
    <je-tc>$90,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>005</je-tc>
    <je-tc>Eve Davis</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Sales Representative</je-tc>
    <je-tc>$70,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>006</je-tc>
    <je-tc>Frank Miller</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Junior Developer</je-tc>
    <je-tc>$68,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>007</je-tc>
    <je-tc>Grace Lee</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Financial Analyst</je-tc>
    <je-tc>$75,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>008</je-tc>
    <je-tc>Henry Wilson</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Operations Manager</je-tc>
    <je-tc>$92,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>009</je-tc>
    <je-tc>Iris Garcia</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Content Strategist</je-tc>
    <je-tc>$72,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>010</je-tc>
    <je-tc>Jack Anderson</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Sales Manager</je-tc>
    <je-tc>$88,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>011</je-tc>
    <je-tc>Karen Martinez</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>QA Engineer</je-tc>
    <je-tc>$78,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>012</je-tc>
    <je-tc>Liam Taylor</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>IT Technician</je-tc>
    <je-tc>$62,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>013</je-tc>
    <je-tc>Mia Thomas</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Recruiter</je-tc>
    <je-tc>$66,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>014</je-tc>
    <je-tc>Noah Jackson</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Tech Lead</je-tc>
    <je-tc>$115,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>015</je-tc>
    <je-tc>Olivia Moore</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>UX Designer</je-tc>
    <je-tc>$82,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>016</je-tc>
    <je-tc>Paul Harris</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Accountant</je-tc>
    <je-tc>$71,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>017</je-tc>
    <je-tc>Quinn Clark</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>SEO Specialist</je-tc>
    <je-tc>$69,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>018</je-tc>
    <je-tc>Rachel Lewis</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Project Coordinator</je-tc>
    <je-tc>$64,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>019</je-tc>
    <je-tc>Sam Robinson</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Account Executive</je-tc>
    <je-tc>$76,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>020</je-tc>
    <je-tc>Tina Walker</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Frontend Developer</je-tc>
    <je-tc>$87,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>021</je-tc>
    <je-tc>Uma Young</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>UI Designer</je-tc>
    <je-tc>$80,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>022</je-tc>
    <je-tc>Victor Hall</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>Systems Administrator</je-tc>
    <je-tc>$74,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>023</je-tc>
    <je-tc>Wendy Allen</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>HR Manager</je-tc>
    <je-tc>$89,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>024</je-tc>
    <je-tc>Xander King</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Backend Developer</je-tc>
    <je-tc>$91,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>025</je-tc>
    <je-tc>Yara Wright</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Finance Manager</je-tc>
    <je-tc>$98,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>026</je-tc>
    <je-tc>Zack Scott</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Brand Manager</je-tc>
    <je-tc>$84,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>027</je-tc>
    <je-tc>Amy Torres</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Supply Chain Analyst</je-tc>
    <je-tc>$67,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>028</je-tc>
    <je-tc>Brian Nguyen</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Business Development</je-tc>
    <je-tc>$81,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>029</je-tc>
    <je-tc>Claire Hill</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Full Stack Developer</je-tc>
    <je-tc>$93,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>030</je-tc>
    <je-tc>Derek Green</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>Product Designer</je-tc>
    <je-tc>$86,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>031</je-tc>
    <je-tc>Emma Adams</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>Network Engineer</je-tc>
    <je-tc>$77,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>032</je-tc>
    <je-tc>Felix Baker</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Training Coordinator</je-tc>
    <je-tc>$63,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>033</je-tc>
    <je-tc>Gina Gonzalez</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Mobile Developer</je-tc>
    <je-tc>$89,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>034</je-tc>
    <je-tc>Hugo Nelson</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Budget Analyst</je-tc>
    <je-tc>$73,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>035</je-tc>
    <je-tc>Ivy Carter</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Social Media Manager</je-tc>
    <je-tc>$70,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>036</je-tc>
    <je-tc>Jake Mitchell</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Logistics Manager</je-tc>
    <je-tc>$79,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>037</je-tc>
    <je-tc>Kelly Perez</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Regional Sales Manager</je-tc>
    <je-tc>$96,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>038</je-tc>
    <je-tc>Leo Roberts</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Data Engineer</je-tc>
    <je-tc>$94,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>039</je-tc>
    <je-tc>Maya Turner</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>Visual Designer</je-tc>
    <je-tc>$78,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>040</je-tc>
    <je-tc>Nick Phillips</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>Security Analyst</je-tc>
    <je-tc>$83,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>041</je-tc>
    <je-tc>Olive Campbell</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Benefits Administrator</je-tc>
    <je-tc>$61,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>042</je-tc>
    <je-tc>Peter Parker</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Solutions Architect</je-tc>
    <je-tc>$118,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>043</je-tc>
    <je-tc>Quincy Evans</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Tax Specialist</je-tc>
    <je-tc>$76,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>044</je-tc>
    <je-tc>Rosa Edwards</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Email Marketing Specialist</je-tc>
    <je-tc>$68,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>045</je-tc>
    <je-tc>Steve Collins</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Quality Assurance Manager</je-tc>
    <je-tc>$85,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>046</je-tc>
    <je-tc>Tara Stewart</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Inside Sales Representative</je-tc>
    <je-tc>$72,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>047</je-tc>
    <je-tc>Umar Sanchez</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Cloud Engineer</je-tc>
    <je-tc>$97,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>048</je-tc>
    <je-tc>Vera Morris</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>Graphic Designer</je-tc>
    <je-tc>$75,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>049</je-tc>
    <je-tc>Will Rogers</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>Database Administrator</je-tc>
    <je-tc>$88,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>050</je-tc>
    <je-tc>Xena Reed</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Compensation Analyst</je-tc>
    <je-tc>$69,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>051</je-tc>
    <je-tc>Yale Cook</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Security Engineer</je-tc>
    <je-tc>$102,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>052</je-tc>
    <je-tc>Zoe Morgan</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Financial Controller</je-tc>
    <je-tc>$105,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>053</je-tc>
    <je-tc>Aaron Bell</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Marketing Coordinator</je-tc>
    <je-tc>$65,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>054</je-tc>
    <je-tc>Bella Murphy</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Process Improvement Specialist</je-tc>
    <je-tc>$71,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>055</je-tc>
    <je-tc>Carl Bailey</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Sales Engineer</je-tc>
    <je-tc>$92,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>056</je-tc>
    <je-tc>Diana Rivera</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Machine Learning Engineer</je-tc>
    <je-tc>$112,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>057</je-tc>
    <je-tc>Ethan Cooper</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>Design Director</je-tc>
    <je-tc>$110,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>058</je-tc>
    <je-tc>Fiona Richardson</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>Help Desk Manager</je-tc>
    <je-tc>$72,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>059</je-tc>
    <je-tc>George Cox</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Employee Relations Specialist</je-tc>
    <je-tc>$67,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>060</je-tc>
    <je-tc>Hannah Howard</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>API Developer</je-tc>
    <je-tc>$88,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>061</je-tc>
    <je-tc>Ian Ward</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Audit Manager</je-tc>
    <je-tc>$95,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>062</je-tc>
    <je-tc>Julia Torres</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Product Marketing Manager</je-tc>
    <je-tc>$91,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>063</je-tc>
    <je-tc>Kevin Peterson</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Facilities Manager</je-tc>
    <je-tc>$74,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>064</je-tc>
    <je-tc>Laura Gray</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Channel Sales Manager</je-tc>
    <je-tc>$89,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>065</je-tc>
    <je-tc>Mason James</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Site Reliability Engineer</je-tc>
    <je-tc>$106,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>066</je-tc>
    <je-tc>Nina Ramirez</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>Interaction Designer</je-tc>
    <je-tc>$83,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>067</je-tc>
    <je-tc>Oscar Watson</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>IT Project Manager</je-tc>
    <je-tc>$94,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>068</je-tc>
    <je-tc>Pam Brooks</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Talent Acquisition Manager</je-tc>
    <je-tc>$87,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>069</je-tc>
    <je-tc>Quentin Kelly</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Embedded Systems Engineer</je-tc>
    <je-tc>$99,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>070</je-tc>
    <je-tc>Rita Sanders</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Payroll Specialist</je-tc>
    <je-tc>$64,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>071</je-tc>
    <je-tc>Sean Price</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Growth Marketing Manager</je-tc>
    <je-tc>$93,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>072</je-tc>
    <je-tc>Tanya Bennett</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Operations Analyst</je-tc>
    <je-tc>$68,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>073</je-tc>
    <je-tc>Ulysses Wood</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Enterprise Sales Executive</je-tc>
    <je-tc>$108,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>074</je-tc>
    <je-tc>Valerie Barnes</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Platform Engineer</je-tc>
    <je-tc>$101,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>075</je-tc>
    <je-tc>Wade Ross</je-tc>
    <je-tc>Design</je-tc>
    <je-tc>Motion Designer</je-tc>
    <je-tc>$79,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>076</je-tc>
    <je-tc>Wilma Henderson</je-tc>
    <je-tc>IT Support</je-tc>
    <je-tc>Cloud Operations Specialist</je-tc>
    <je-tc>$81,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>077</je-tc>
    <je-tc>Xavier Coleman</je-tc>
    <je-tc>HR</je-tc>
    <je-tc>Learning & Development Specialist</je-tc>
    <je-tc>$70,000</je-tc>
    <je-tc>Inactive</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>078</je-tc>
    <je-tc>Yvonne Jenkins</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Performance Engineer</je-tc>
    <je-tc>$96,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>079</je-tc>
    <je-tc>Zachary Perry</je-tc>
    <je-tc>Finance</je-tc>
    <je-tc>Treasury Analyst</je-tc>
    <je-tc>$78,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>080</je-tc>
    <je-tc>Abby Powell</je-tc>
    <je-tc>Marketing</je-tc>
    <je-tc>Marketing Automation Specialist</je-tc>
    <je-tc>$73,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>081</je-tc>
    <je-tc>Blake Long</je-tc>
    <je-tc>Operations</je-tc>
    <je-tc>Procurement Specialist</je-tc>
    <je-tc>$66,000</je-tc>
    <je-tc>On Leave</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>082</je-tc>
    <je-tc>Chloe Patterson</je-tc>
    <je-tc>Sales</je-tc>
    <je-tc>Customer Success Manager</je-tc>
    <je-tc>$84,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr>
    <je-tc copy sticky>083</je-tc>
    <je-tc>Dylan Hughes</je-tc>
    <je-tc>Engineering</je-tc>
    <je-tc>Infrastructure Engineer</je-tc>
    <je-tc>$98,000</je-tc>
    <je-tc>Active</je-tc>
  </je-tr>
  <je-tr type="footer">
    <je-tc col-span="6">
      <je-toolbar>
        <span slot="end">1 to 10 of 83</span>
        <je-stack mode="row" space="none" slot="end">
          <je-button fill="clear" class="icon-only">
            <je-icon>first_page</je-icon>
          </je-button>
          <je-button fill="clear" class="icon-only">
            <je-icon>chevron_left</je-icon>
          </je-button>
          <span>Page 1 of 9</span>
          <je-button fill="clear" class="icon-only">
            <je-icon>chevron_right</je-icon>
          </je-button>
          <je-button fill="clear" class="icon-only">
            <je-icon>last_page</je-icon>
          </je-button>
        </je-stack>
      </je-toolbar>
    </je-tc>
  </je-tr>
</je-table>
