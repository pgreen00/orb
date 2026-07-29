---
title: "OrbGrid | <orb-grid>"
sidebar_label: "Grid"
---

## Usage

<orb-grid id="da-table">
  <orb-gr type="header">
    <orb-gc sticky>
      <orb-grid-filter type="text">ID</orb-grid-filter>
    </orb-gc>
    <orb-gc>Name</orb-gc>
    <orb-gc>Department</orb-gc>
    <orb-gc>Position</orb-gc>
    <orb-gc>Salary</orb-gc>
    <orb-gc>Status</orb-gc>
  </orb-gr>
  <template>
    <orb-gr>
      <orb-gc copy sticky></orb-gc>
      <orb-gc></orb-gc>
      <orb-gc></orb-gc>
      <orb-gc></orb-gc>
      <orb-gc></orb-gc>
      <orb-gc></orb-gc>
    </orb-gr>
  </template>
  <orb-gr type="footer">
    <orb-gc col-span="6">
      <orb-toolbar>
        <span slot="end">1 to 10 of 83</span>
        <orb-stack mode="row" space="none" slot="end">
          <orb-button fill="clear" class="icon-only">
            <orb-icon>first_page</orb-icon>
          </orb-button>
          <orb-button fill="clear" class="icon-only">
            <orb-icon>chevron_left</orb-icon>
          </orb-button>
          <span>Page 1 of 9</span>
          <orb-button fill="clear" class="icon-only">
            <orb-icon>chevron_right</orb-icon>
          </orb-button>
          <orb-button fill="clear" class="icon-only">
            <orb-icon>last_page</orb-icon>
          </orb-button>
        </orb-stack>
      </orb-toolbar>
    </orb-gc>
  </orb-gr>
</orb-grid>

<script type="module">
const employees = await fetch('/employees.json').then(t => t.json());
await customElements.whenDefined('orb-grid')
document.querySelector('#da-table').data = employees
</script>

<orb-grid>
  <orb-gr type="header">
    <orb-gc sticky>
      <orb-grid-filter type="text">ID</orb-grid-filter>
    </orb-gc>
    <orb-gc>Name</orb-gc>
    <orb-gc>Department</orb-gc>
    <orb-gc>Position</orb-gc>
    <orb-gc>Salary</orb-gc>
    <orb-gc>Status</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc row-span="2" copy sticky>001</orb-gc>
    <orb-gc>Alice Johnson</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Senior Developer</orb-gc>
    <orb-gc>$95,000</orb-gc>
    <orb-gc>Active</orb-gc>
    <orb-gc>Bob Smith</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Marketing Manager</orb-gc>
    <orb-gc>$85,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>003</orb-gc>
    <orb-gc>Carol White</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>HR Specialist</orb-gc>
    <orb-gc>$65,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>004</orb-gc>
    <orb-gc>David Brown</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>DevOps Engineer</orb-gc>
    <orb-gc>$90,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>005</orb-gc>
    <orb-gc>Eve Davis</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Sales Representative</orb-gc>
    <orb-gc>$70,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>006</orb-gc>
    <orb-gc>Frank Miller</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Junior Developer</orb-gc>
    <orb-gc>$68,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>007</orb-gc>
    <orb-gc>Grace Lee</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Financial Analyst</orb-gc>
    <orb-gc>$75,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>008</orb-gc>
    <orb-gc>Henry Wilson</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Operations Manager</orb-gc>
    <orb-gc>$92,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>009</orb-gc>
    <orb-gc>Iris Garcia</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Content Strategist</orb-gc>
    <orb-gc>$72,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>010</orb-gc>
    <orb-gc>Jack Anderson</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Sales Manager</orb-gc>
    <orb-gc>$88,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>011</orb-gc>
    <orb-gc>Karen Martinez</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>QA Engineer</orb-gc>
    <orb-gc>$78,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>012</orb-gc>
    <orb-gc>Liam Taylor</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>IT Technician</orb-gc>
    <orb-gc>$62,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>013</orb-gc>
    <orb-gc>Mia Thomas</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Recruiter</orb-gc>
    <orb-gc>$66,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>014</orb-gc>
    <orb-gc>Noah Jackson</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Tech Lead</orb-gc>
    <orb-gc>$115,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>015</orb-gc>
    <orb-gc>Olivia Moore</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>UX Designer</orb-gc>
    <orb-gc>$82,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>016</orb-gc>
    <orb-gc>Paul Harris</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Accountant</orb-gc>
    <orb-gc>$71,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>017</orb-gc>
    <orb-gc>Quinn Clark</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>SEO Specialist</orb-gc>
    <orb-gc>$69,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>018</orb-gc>
    <orb-gc>Rachel Lewis</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Project Coordinator</orb-gc>
    <orb-gc>$64,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>019</orb-gc>
    <orb-gc>Sam Robinson</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Account Executive</orb-gc>
    <orb-gc>$76,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>020</orb-gc>
    <orb-gc>Tina Walker</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Frontend Developer</orb-gc>
    <orb-gc>$87,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>021</orb-gc>
    <orb-gc>Uma Young</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>UI Designer</orb-gc>
    <orb-gc>$80,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>022</orb-gc>
    <orb-gc>Victor Hall</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>Systems Administrator</orb-gc>
    <orb-gc>$74,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>023</orb-gc>
    <orb-gc>Wendy Allen</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>HR Manager</orb-gc>
    <orb-gc>$89,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>024</orb-gc>
    <orb-gc>Xander King</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Backend Developer</orb-gc>
    <orb-gc>$91,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>025</orb-gc>
    <orb-gc>Yara Wright</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Finance Manager</orb-gc>
    <orb-gc>$98,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>026</orb-gc>
    <orb-gc>Zack Scott</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Brand Manager</orb-gc>
    <orb-gc>$84,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>027</orb-gc>
    <orb-gc>Amy Torres</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Supply Chain Analyst</orb-gc>
    <orb-gc>$67,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>028</orb-gc>
    <orb-gc>Brian Nguyen</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Business Development</orb-gc>
    <orb-gc>$81,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>029</orb-gc>
    <orb-gc>Claire Hill</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Full Stack Developer</orb-gc>
    <orb-gc>$93,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>030</orb-gc>
    <orb-gc>Derek Green</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>Product Designer</orb-gc>
    <orb-gc>$86,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>031</orb-gc>
    <orb-gc>Emma Adams</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>Network Engineer</orb-gc>
    <orb-gc>$77,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>032</orb-gc>
    <orb-gc>Felix Baker</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Training Coordinator</orb-gc>
    <orb-gc>$63,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>033</orb-gc>
    <orb-gc>Gina Gonzalez</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Mobile Developer</orb-gc>
    <orb-gc>$89,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>034</orb-gc>
    <orb-gc>Hugo Nelson</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Budget Analyst</orb-gc>
    <orb-gc>$73,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>035</orb-gc>
    <orb-gc>Ivy Carter</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Social Media Manager</orb-gc>
    <orb-gc>$70,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>036</orb-gc>
    <orb-gc>Jake Mitchell</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Logistics Manager</orb-gc>
    <orb-gc>$79,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>037</orb-gc>
    <orb-gc>Kelly Perez</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Regional Sales Manager</orb-gc>
    <orb-gc>$96,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>038</orb-gc>
    <orb-gc>Leo Roberts</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Data Engineer</orb-gc>
    <orb-gc>$94,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>039</orb-gc>
    <orb-gc>Maya Turner</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>Visual Designer</orb-gc>
    <orb-gc>$78,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>040</orb-gc>
    <orb-gc>Nick Phillips</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>Security Analyst</orb-gc>
    <orb-gc>$83,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>041</orb-gc>
    <orb-gc>Olive Campbell</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Benefits Administrator</orb-gc>
    <orb-gc>$61,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>042</orb-gc>
    <orb-gc>Peter Parker</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Solutions Architect</orb-gc>
    <orb-gc>$118,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>043</orb-gc>
    <orb-gc>Quincy Evans</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Tax Specialist</orb-gc>
    <orb-gc>$76,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>044</orb-gc>
    <orb-gc>Rosa Edwards</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Email Marketing Specialist</orb-gc>
    <orb-gc>$68,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>045</orb-gc>
    <orb-gc>Steve Collins</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Quality Assurance Manager</orb-gc>
    <orb-gc>$85,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>046</orb-gc>
    <orb-gc>Tara Stewart</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Inside Sales Representative</orb-gc>
    <orb-gc>$72,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>047</orb-gc>
    <orb-gc>Umar Sanchez</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Cloud Engineer</orb-gc>
    <orb-gc>$97,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>048</orb-gc>
    <orb-gc>Vera Morris</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>Graphic Designer</orb-gc>
    <orb-gc>$75,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>049</orb-gc>
    <orb-gc>Will Rogers</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>Database Administrator</orb-gc>
    <orb-gc>$88,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>050</orb-gc>
    <orb-gc>Xena Reed</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Compensation Analyst</orb-gc>
    <orb-gc>$69,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>051</orb-gc>
    <orb-gc>Yale Cook</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Security Engineer</orb-gc>
    <orb-gc>$102,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>052</orb-gc>
    <orb-gc>Zoe Morgan</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Financial Controller</orb-gc>
    <orb-gc>$105,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>053</orb-gc>
    <orb-gc>Aaron Bell</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Marketing Coordinator</orb-gc>
    <orb-gc>$65,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>054</orb-gc>
    <orb-gc>Bella Murphy</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Process Improvement Specialist</orb-gc>
    <orb-gc>$71,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>055</orb-gc>
    <orb-gc>Carl Bailey</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Sales Engineer</orb-gc>
    <orb-gc>$92,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>056</orb-gc>
    <orb-gc>Diana Rivera</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Machine Learning Engineer</orb-gc>
    <orb-gc>$112,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>057</orb-gc>
    <orb-gc>Ethan Cooper</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>Design Director</orb-gc>
    <orb-gc>$110,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>058</orb-gc>
    <orb-gc>Fiona Richardson</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>Help Desk Manager</orb-gc>
    <orb-gc>$72,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>059</orb-gc>
    <orb-gc>George Cox</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Employee Relations Specialist</orb-gc>
    <orb-gc>$67,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>060</orb-gc>
    <orb-gc>Hannah Howard</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>API Developer</orb-gc>
    <orb-gc>$88,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>061</orb-gc>
    <orb-gc>Ian Ward</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Audit Manager</orb-gc>
    <orb-gc>$95,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>062</orb-gc>
    <orb-gc>Julia Torres</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Product Marketing Manager</orb-gc>
    <orb-gc>$91,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>063</orb-gc>
    <orb-gc>Kevin Peterson</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Facilities Manager</orb-gc>
    <orb-gc>$74,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>064</orb-gc>
    <orb-gc>Laura Gray</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Channel Sales Manager</orb-gc>
    <orb-gc>$89,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>065</orb-gc>
    <orb-gc>Mason James</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Site Reliability Engineer</orb-gc>
    <orb-gc>$106,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>066</orb-gc>
    <orb-gc>Nina Ramirez</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>Interaction Designer</orb-gc>
    <orb-gc>$83,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>067</orb-gc>
    <orb-gc>Oscar Watson</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>IT Project Manager</orb-gc>
    <orb-gc>$94,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>068</orb-gc>
    <orb-gc>Pam Brooks</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Talent Acquisition Manager</orb-gc>
    <orb-gc>$87,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>069</orb-gc>
    <orb-gc>Quentin Kelly</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Embedded Systems Engineer</orb-gc>
    <orb-gc>$99,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>070</orb-gc>
    <orb-gc>Rita Sanders</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Payroll Specialist</orb-gc>
    <orb-gc>$64,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>071</orb-gc>
    <orb-gc>Sean Price</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Growth Marketing Manager</orb-gc>
    <orb-gc>$93,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>072</orb-gc>
    <orb-gc>Tanya Bennett</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Operations Analyst</orb-gc>
    <orb-gc>$68,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>073</orb-gc>
    <orb-gc>Ulysses Wood</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Enterprise Sales Executive</orb-gc>
    <orb-gc>$108,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>074</orb-gc>
    <orb-gc>Valerie Barnes</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Platform Engineer</orb-gc>
    <orb-gc>$101,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>075</orb-gc>
    <orb-gc>Wade Ross</orb-gc>
    <orb-gc>Design</orb-gc>
    <orb-gc>Motion Designer</orb-gc>
    <orb-gc>$79,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>076</orb-gc>
    <orb-gc>Wilma Henderson</orb-gc>
    <orb-gc>IT Support</orb-gc>
    <orb-gc>Cloud Operations Specialist</orb-gc>
    <orb-gc>$81,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>077</orb-gc>
    <orb-gc>Xavier Coleman</orb-gc>
    <orb-gc>HR</orb-gc>
    <orb-gc>Learning & Development Specialist</orb-gc>
    <orb-gc>$70,000</orb-gc>
    <orb-gc>Inactive</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>078</orb-gc>
    <orb-gc>Yvonne Orbnkins</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Performance Engineer</orb-gc>
    <orb-gc>$96,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>079</orb-gc>
    <orb-gc>Zachary Perry</orb-gc>
    <orb-gc>Finance</orb-gc>
    <orb-gc>Treasury Analyst</orb-gc>
    <orb-gc>$78,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>080</orb-gc>
    <orb-gc>Abby Powell</orb-gc>
    <orb-gc>Marketing</orb-gc>
    <orb-gc>Marketing Automation Specialist</orb-gc>
    <orb-gc>$73,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>081</orb-gc>
    <orb-gc>Blake Long</orb-gc>
    <orb-gc>Operations</orb-gc>
    <orb-gc>Procurement Specialist</orb-gc>
    <orb-gc>$66,000</orb-gc>
    <orb-gc>On Leave</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>082</orb-gc>
    <orb-gc>Chloe Patterson</orb-gc>
    <orb-gc>Sales</orb-gc>
    <orb-gc>Customer Success Manager</orb-gc>
    <orb-gc>$84,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr>
    <orb-gc copy sticky>083</orb-gc>
    <orb-gc>Dylan Hughes</orb-gc>
    <orb-gc>Engineering</orb-gc>
    <orb-gc>Infrastructure Engineer</orb-gc>
    <orb-gc>$98,000</orb-gc>
    <orb-gc>Active</orb-gc>
  </orb-gr>
  <orb-gr type="footer">
    <orb-gc col-span="6">
      <orb-toolbar>
        <span slot="end">1 to 10 of 83</span>
        <orb-stack mode="row" space="none" slot="end">
          <orb-button fill="clear" class="icon-only">
            <orb-icon>first_page</orb-icon>
          </orb-button>
          <orb-button fill="clear" class="icon-only">
            <orb-icon>chevron_left</orb-icon>
          </orb-button>
          <span>Page 1 of 9</span>
          <orb-button fill="clear" class="icon-only">
            <orb-icon>chevron_right</orb-icon>
          </orb-button>
          <orb-button fill="clear" class="icon-only">
            <orb-icon>last_page</orb-icon>
          </orb-button>
        </orb-stack>
      </orb-toolbar>
    </orb-gc>
  </orb-gr>
</orb-grid>
