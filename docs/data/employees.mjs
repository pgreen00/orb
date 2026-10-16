import employees from '../public/employees.json' with { type: 'json' }

export default function () {
  return employees.map(e => ({
    id: e[0],
    name: e[1],
    dept: e[2],
    role: e[3],
    salary: e[4],
    status: e[5],
  }))
}
