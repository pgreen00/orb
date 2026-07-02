---
title: "OrbTable | <orb-table>"
sidebar_label: "Table"
---

## Usage

<orb-table id="da-table">
  <orb-tr type="header">
    <orb-tc sticky>
      <orb-table-filter type="text">ID</orb-table-filter>
    </orb-tc>
    <orb-tc>Name</orb-tc>
    <orb-tc>Department</orb-tc>
    <orb-tc>Position</orb-tc>
    <orb-tc>Salary</orb-tc>
    <orb-tc>Status</orb-tc>
  </orb-tr>
  <template>
    <orb-tr>
      <orb-tc copy sticky></orb-tc>
      <orb-tc></orb-tc>
      <orb-tc></orb-tc>
      <orb-tc></orb-tc>
      <orb-tc></orb-tc>
      <orb-tc></orb-tc>
    </orb-tr>
  </template>
  <orb-tr type="footer">
    <orb-tc col-span="6">
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
    </orb-tc>
  </orb-tr>
</orb-table>

<script type="module">
const employees = await fetch('/employees.json').then(t => t.json());
await customElements.whenDefined('orb-table')
document.querySelector('#da-table').data = employees
</script>

<orb-table>
  <orb-tr type="header">
    <orb-tc sticky>
      <orb-table-filter type="text">ID</orb-table-filter>
    </orb-tc>
    <orb-tc>Name</orb-tc>
    <orb-tc>Department</orb-tc>
    <orb-tc>Position</orb-tc>
    <orb-tc>Salary</orb-tc>
    <orb-tc>Status</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc row-span="2" copy sticky>001</orb-tc>
    <orb-tc>Alice Johnson</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Senior Developer</orb-tc>
    <orb-tc>$95,000</orb-tc>
    <orb-tc>Active</orb-tc>
    <orb-tc>Bob Smith</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Marketing Manager</orb-tc>
    <orb-tc>$85,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>003</orb-tc>
    <orb-tc>Carol White</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>HR Specialist</orb-tc>
    <orb-tc>$65,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>004</orb-tc>
    <orb-tc>David Brown</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>DevOps Engineer</orb-tc>
    <orb-tc>$90,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>005</orb-tc>
    <orb-tc>Eve Davis</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Sales Representative</orb-tc>
    <orb-tc>$70,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>006</orb-tc>
    <orb-tc>Frank Miller</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Junior Developer</orb-tc>
    <orb-tc>$68,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>007</orb-tc>
    <orb-tc>Grace Lee</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Financial Analyst</orb-tc>
    <orb-tc>$75,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>008</orb-tc>
    <orb-tc>Henry Wilson</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Operations Manager</orb-tc>
    <orb-tc>$92,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>009</orb-tc>
    <orb-tc>Iris Garcia</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Content Strategist</orb-tc>
    <orb-tc>$72,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>010</orb-tc>
    <orb-tc>Jack Anderson</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Sales Manager</orb-tc>
    <orb-tc>$88,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>011</orb-tc>
    <orb-tc>Karen Martinez</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>QA Engineer</orb-tc>
    <orb-tc>$78,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>012</orb-tc>
    <orb-tc>Liam Taylor</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>IT Technician</orb-tc>
    <orb-tc>$62,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>013</orb-tc>
    <orb-tc>Mia Thomas</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Recruiter</orb-tc>
    <orb-tc>$66,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>014</orb-tc>
    <orb-tc>Noah Jackson</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Tech Lead</orb-tc>
    <orb-tc>$115,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>015</orb-tc>
    <orb-tc>Olivia Moore</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>UX Designer</orb-tc>
    <orb-tc>$82,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>016</orb-tc>
    <orb-tc>Paul Harris</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Accountant</orb-tc>
    <orb-tc>$71,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>017</orb-tc>
    <orb-tc>Quinn Clark</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>SEO Specialist</orb-tc>
    <orb-tc>$69,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>018</orb-tc>
    <orb-tc>Rachel Lewis</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Project Coordinator</orb-tc>
    <orb-tc>$64,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>019</orb-tc>
    <orb-tc>Sam Robinson</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Account Executive</orb-tc>
    <orb-tc>$76,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>020</orb-tc>
    <orb-tc>Tina Walker</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Frontend Developer</orb-tc>
    <orb-tc>$87,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>021</orb-tc>
    <orb-tc>Uma Young</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>UI Designer</orb-tc>
    <orb-tc>$80,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>022</orb-tc>
    <orb-tc>Victor Hall</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>Systems Administrator</orb-tc>
    <orb-tc>$74,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>023</orb-tc>
    <orb-tc>Wendy Allen</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>HR Manager</orb-tc>
    <orb-tc>$89,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>024</orb-tc>
    <orb-tc>Xander King</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Backend Developer</orb-tc>
    <orb-tc>$91,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>025</orb-tc>
    <orb-tc>Yara Wright</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Finance Manager</orb-tc>
    <orb-tc>$98,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>026</orb-tc>
    <orb-tc>Zack Scott</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Brand Manager</orb-tc>
    <orb-tc>$84,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>027</orb-tc>
    <orb-tc>Amy Torres</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Supply Chain Analyst</orb-tc>
    <orb-tc>$67,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>028</orb-tc>
    <orb-tc>Brian Nguyen</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Business Development</orb-tc>
    <orb-tc>$81,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>029</orb-tc>
    <orb-tc>Claire Hill</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Full Stack Developer</orb-tc>
    <orb-tc>$93,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>030</orb-tc>
    <orb-tc>Derek Green</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>Product Designer</orb-tc>
    <orb-tc>$86,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>031</orb-tc>
    <orb-tc>Emma Adams</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>Network Engineer</orb-tc>
    <orb-tc>$77,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>032</orb-tc>
    <orb-tc>Felix Baker</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Training Coordinator</orb-tc>
    <orb-tc>$63,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>033</orb-tc>
    <orb-tc>Gina Gonzalez</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Mobile Developer</orb-tc>
    <orb-tc>$89,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>034</orb-tc>
    <orb-tc>Hugo Nelson</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Budget Analyst</orb-tc>
    <orb-tc>$73,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>035</orb-tc>
    <orb-tc>Ivy Carter</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Social Media Manager</orb-tc>
    <orb-tc>$70,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>036</orb-tc>
    <orb-tc>Jake Mitchell</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Logistics Manager</orb-tc>
    <orb-tc>$79,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>037</orb-tc>
    <orb-tc>Kelly Perez</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Regional Sales Manager</orb-tc>
    <orb-tc>$96,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>038</orb-tc>
    <orb-tc>Leo Roberts</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Data Engineer</orb-tc>
    <orb-tc>$94,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>039</orb-tc>
    <orb-tc>Maya Turner</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>Visual Designer</orb-tc>
    <orb-tc>$78,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>040</orb-tc>
    <orb-tc>Nick Phillips</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>Security Analyst</orb-tc>
    <orb-tc>$83,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>041</orb-tc>
    <orb-tc>Olive Campbell</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Benefits Administrator</orb-tc>
    <orb-tc>$61,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>042</orb-tc>
    <orb-tc>Peter Parker</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Solutions Architect</orb-tc>
    <orb-tc>$118,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>043</orb-tc>
    <orb-tc>Quincy Evans</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Tax Specialist</orb-tc>
    <orb-tc>$76,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>044</orb-tc>
    <orb-tc>Rosa Edwards</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Email Marketing Specialist</orb-tc>
    <orb-tc>$68,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>045</orb-tc>
    <orb-tc>Steve Collins</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Quality Assurance Manager</orb-tc>
    <orb-tc>$85,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>046</orb-tc>
    <orb-tc>Tara Stewart</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Inside Sales Representative</orb-tc>
    <orb-tc>$72,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>047</orb-tc>
    <orb-tc>Umar Sanchez</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Cloud Engineer</orb-tc>
    <orb-tc>$97,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>048</orb-tc>
    <orb-tc>Vera Morris</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>Graphic Designer</orb-tc>
    <orb-tc>$75,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>049</orb-tc>
    <orb-tc>Will Rogers</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>Database Administrator</orb-tc>
    <orb-tc>$88,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>050</orb-tc>
    <orb-tc>Xena Reed</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Compensation Analyst</orb-tc>
    <orb-tc>$69,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>051</orb-tc>
    <orb-tc>Yale Cook</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Security Engineer</orb-tc>
    <orb-tc>$102,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>052</orb-tc>
    <orb-tc>Zoe Morgan</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Financial Controller</orb-tc>
    <orb-tc>$105,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>053</orb-tc>
    <orb-tc>Aaron Bell</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Marketing Coordinator</orb-tc>
    <orb-tc>$65,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>054</orb-tc>
    <orb-tc>Bella Murphy</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Process Improvement Specialist</orb-tc>
    <orb-tc>$71,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>055</orb-tc>
    <orb-tc>Carl Bailey</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Sales Engineer</orb-tc>
    <orb-tc>$92,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>056</orb-tc>
    <orb-tc>Diana Rivera</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Machine Learning Engineer</orb-tc>
    <orb-tc>$112,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>057</orb-tc>
    <orb-tc>Ethan Cooper</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>Design Director</orb-tc>
    <orb-tc>$110,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>058</orb-tc>
    <orb-tc>Fiona Richardson</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>Help Desk Manager</orb-tc>
    <orb-tc>$72,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>059</orb-tc>
    <orb-tc>George Cox</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Employee Relations Specialist</orb-tc>
    <orb-tc>$67,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>060</orb-tc>
    <orb-tc>Hannah Howard</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>API Developer</orb-tc>
    <orb-tc>$88,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>061</orb-tc>
    <orb-tc>Ian Ward</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Audit Manager</orb-tc>
    <orb-tc>$95,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>062</orb-tc>
    <orb-tc>Julia Torres</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Product Marketing Manager</orb-tc>
    <orb-tc>$91,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>063</orb-tc>
    <orb-tc>Kevin Peterson</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Facilities Manager</orb-tc>
    <orb-tc>$74,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>064</orb-tc>
    <orb-tc>Laura Gray</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Channel Sales Manager</orb-tc>
    <orb-tc>$89,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>065</orb-tc>
    <orb-tc>Mason James</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Site Reliability Engineer</orb-tc>
    <orb-tc>$106,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>066</orb-tc>
    <orb-tc>Nina Ramirez</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>Interaction Designer</orb-tc>
    <orb-tc>$83,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>067</orb-tc>
    <orb-tc>Oscar Watson</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>IT Project Manager</orb-tc>
    <orb-tc>$94,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>068</orb-tc>
    <orb-tc>Pam Brooks</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Talent Acquisition Manager</orb-tc>
    <orb-tc>$87,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>069</orb-tc>
    <orb-tc>Quentin Kelly</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Embedded Systems Engineer</orb-tc>
    <orb-tc>$99,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>070</orb-tc>
    <orb-tc>Rita Sanders</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Payroll Specialist</orb-tc>
    <orb-tc>$64,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>071</orb-tc>
    <orb-tc>Sean Price</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Growth Marketing Manager</orb-tc>
    <orb-tc>$93,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>072</orb-tc>
    <orb-tc>Tanya Bennett</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Operations Analyst</orb-tc>
    <orb-tc>$68,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>073</orb-tc>
    <orb-tc>Ulysses Wood</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Enterprise Sales Executive</orb-tc>
    <orb-tc>$108,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>074</orb-tc>
    <orb-tc>Valerie Barnes</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Platform Engineer</orb-tc>
    <orb-tc>$101,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>075</orb-tc>
    <orb-tc>Wade Ross</orb-tc>
    <orb-tc>Design</orb-tc>
    <orb-tc>Motion Designer</orb-tc>
    <orb-tc>$79,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>076</orb-tc>
    <orb-tc>Wilma Henderson</orb-tc>
    <orb-tc>IT Support</orb-tc>
    <orb-tc>Cloud Operations Specialist</orb-tc>
    <orb-tc>$81,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>077</orb-tc>
    <orb-tc>Xavier Coleman</orb-tc>
    <orb-tc>HR</orb-tc>
    <orb-tc>Learning & Development Specialist</orb-tc>
    <orb-tc>$70,000</orb-tc>
    <orb-tc>Inactive</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>078</orb-tc>
    <orb-tc>Yvonne Orbnkins</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Performance Engineer</orb-tc>
    <orb-tc>$96,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>079</orb-tc>
    <orb-tc>Zachary Perry</orb-tc>
    <orb-tc>Finance</orb-tc>
    <orb-tc>Treasury Analyst</orb-tc>
    <orb-tc>$78,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>080</orb-tc>
    <orb-tc>Abby Powell</orb-tc>
    <orb-tc>Marketing</orb-tc>
    <orb-tc>Marketing Automation Specialist</orb-tc>
    <orb-tc>$73,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>081</orb-tc>
    <orb-tc>Blake Long</orb-tc>
    <orb-tc>Operations</orb-tc>
    <orb-tc>Procurement Specialist</orb-tc>
    <orb-tc>$66,000</orb-tc>
    <orb-tc>On Leave</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>082</orb-tc>
    <orb-tc>Chloe Patterson</orb-tc>
    <orb-tc>Sales</orb-tc>
    <orb-tc>Customer Success Manager</orb-tc>
    <orb-tc>$84,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr>
    <orb-tc copy sticky>083</orb-tc>
    <orb-tc>Dylan Hughes</orb-tc>
    <orb-tc>Engineering</orb-tc>
    <orb-tc>Infrastructure Engineer</orb-tc>
    <orb-tc>$98,000</orb-tc>
    <orb-tc>Active</orb-tc>
  </orb-tr>
  <orb-tr type="footer">
    <orb-tc col-span="6">
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
    </orb-tc>
  </orb-tr>
</orb-table>
