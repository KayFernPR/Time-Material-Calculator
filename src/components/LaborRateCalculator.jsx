import { useState, useMemo } from 'react'

// Step 1: Hours Not Worked options
const HOURS_NOT_WORKED_OPTIONS = [
  { id: 'vacation', label: 'Vacation' },
  { id: 'sick-time', label: 'Sick Time' },
  { id: 'holidays', label: 'Holidays' }
]

// Step 1: Non-Billable Hours options
const NON_BILLABLE_HOURS_OPTIONS = [
  { id: 'training', label: 'Training' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'drive-time', label: 'Drive time - Not billed to Job' },
  { id: 'rework', label: 'Rework' },
  { id: 'administration', label: 'Administration' },
  { id: 'downtime-cleaning', label: 'Downtime/Cleaning' },
  { id: 'minimum-weekly-hours', label: 'Minimum Weekly Hours' }
]

// Step 2: Mandatory Payroll Tax Burden options
const MANDATORY_PAYROLL_TAX_OPTIONS = [
  { id: 'federal-taxes', label: 'Federal Taxes', defaultPercent: 0 },
  { id: 'social-security', label: 'Social Security', defaultPercent: 6.20 },
  { id: 'medicare', label: 'Medicare', defaultPercent: 1.45 }
]

// Step 2: Mandatory Worker Burden options
const MANDATORY_WORKER_BURDEN_OPTIONS = [
  { id: 'state-unemployment', label: 'State Unemployment', defaultPercent: 2.70 },
  { id: 'federal-unemployment', label: 'Federal Unemployment', defaultPercent: 0.60 },
  { id: 'workers-compensation', label: 'Workers Compensation', defaultPercent: 3.00 }
]

// Step 2: Benefits Burden options
const BENEFITS_BURDEN_OPTIONS = [
  { id: 'health-insurance', label: 'Health Insurance Premiums', defaultPercent: 12.00 },
  { id: 'retirement-match', label: 'Retirement Match', defaultPercent: 2.00 }
]

// Step 2: Additional Overheads options
const ADDITIONAL_OVERHEADS_OPTIONS = [
  { id: 'uniforms', label: 'Uniforms', defaultPercent: 0.50 },
  { id: 'boot-allowance', label: 'Boot Allowance', defaultPercent: 0.10 },
  { id: 'phone-data', label: 'Phone & Data', defaultPercent: 1.00 },
  { id: 'computer-tablet', label: 'Computer / Tablet & Software', defaultPercent: 3.00 }
]

// Step 2: Employee Costs options
const EMPLOYEE_COSTS_OPTIONS = [
  { id: 'training-certifications', label: 'Training & Certifications', defaultPercent: 5.00 },
  { id: 'christmas-bonus', label: 'Christmas Bonus', defaultPercent: 1.00 },
  { id: 'performance-bonus', label: 'Performance Bonus', defaultPercent: 5.00 },
  { id: 'non-billable-tools', label: 'Other: Non-Billable Tools', defaultPercent: 6.25 }
]

const PAID_CAPACITY = 2080 // 52 weeks * 40 hours

function LaborRateCalculator() {
  // Step 1: Hours data
  const [hoursNotWorked, setHoursNotWorked] = useState({})
  const [nonBillableHours, setNonBillableHours] = useState({})
  const [customHoursNotWorked, setCustomHoursNotWorked] = useState([])
  const [newCustomHoursNotWorked, setNewCustomHoursNotWorked] = useState('')
  const [customNonBillable, setCustomNonBillable] = useState([])
  const [newCustomNonBillable, setNewCustomNonBillable] = useState('')
  
  // Step 2: Employee earned data
  const [workersWage, setWorkersWage] = useState(40.00)
  const [mandatoryPayrollTaxPercents, setMandatoryPayrollTaxPercents] = useState(
    Object.fromEntries(MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [mandatoryWorkerBurdenPercents, setMandatoryWorkerBurdenPercents] = useState(
    Object.fromEntries(MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customPayrollTaxFields, setCustomPayrollTaxFields] = useState([])
  const [customWorkerBurdenFields, setCustomWorkerBurdenFields] = useState([])
  const [newCustomPayrollTax, setNewCustomPayrollTax] = useState({ name: '', percent: 0 })
  const [newCustomWorkerBurden, setNewCustomWorkerBurden] = useState({ name: '', percent: 0 })
  const [benefitsBurdenPercents, setBenefitsBurdenPercents] = useState(
    Object.fromEntries(BENEFITS_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [additionalOverheadsPercents, setAdditionalOverheadsPercents] = useState(
    Object.fromEntries(ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [employeeCostsPercents, setEmployeeCostsPercents] = useState(
    Object.fromEntries(EMPLOYEE_COSTS_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customEmployeeCosts, setCustomEmployeeCosts] = useState([])
  const [newCustomEmployeeCost, setNewCustomEmployeeCost] = useState({ name: '', percent: 0 })
  
  // Step 3: Overhead and Profit
  const [divisionOverheadPercent, setDivisionOverheadPercent] = useState(14.00)
  const [generalCompanyOverheadPercent, setGeneralCompanyOverheadPercent] = useState(8.00)
  const [profitPercent, setProfitPercent] = useState(20.00)

  // Calculations
  const calculations = useMemo(() => {
    // Step 1 calculations - Individual field percentages
    const hoursNotWorkedPercentages = Object.fromEntries(
      Object.entries(hoursNotWorked).map(([id, hours]) => [
        id,
        PAID_CAPACITY > 0 ? ((parseFloat(hours) || 0) / PAID_CAPACITY) * 100 : 0
      ])
    )
    
    const nonBillableHoursPercentages = Object.fromEntries(
      Object.entries(nonBillableHours).map(([id, hours]) => [
        id,
        PAID_CAPACITY > 0 ? ((parseFloat(hours) || 0) / PAID_CAPACITY) * 100 : 0
      ])
    )
    
    // Step 1 calculations - Totals
    const totalHoursNotWorked = Object.values(hoursNotWorked).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalNonBillableHours = Object.values(nonBillableHours).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalHoursAvailable = PAID_CAPACITY - totalHoursNotWorked - totalNonBillableHours
    const utilizationPercent = totalHoursAvailable / PAID_CAPACITY
    
    // Total percentages
    const totalHoursNotWorkedPercent = PAID_CAPACITY > 0 ? (totalHoursNotWorked / PAID_CAPACITY) * 100 : 0
    const totalNonBillableHoursPercent = PAID_CAPACITY > 0 ? (totalNonBillableHours / PAID_CAPACITY) * 100 : 0

    // Step 2 calculations - Workers Wage Charged is the key rate (Hourly Rate)
    const workersWageCharged = utilizationPercent > 0 ? workersWage / utilizationPercent : 0

    // Mandatory Payroll Tax Burden calculations
    const payrollTaxHourlyRates = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        workersWage * ((mandatoryPayrollTaxPercents[opt.id] || 0) / 100)
      ]),
      ...customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        workersWage * ((field.percent || 0) / 100)
      ])
    ])
    
    const payrollTaxCharged = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((mandatoryPayrollTaxPercents[opt.id] || 0) / 100)
      ]),
      ...customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageCharged * ((field.percent || 0) / 100)
      ])
    ])
    
    const combinedFederalPayrollTaxPercent = Object.values(mandatoryPayrollTaxPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                             customPayrollTaxFields.reduce((sum, field) => sum + (field.percent || 0), 0)
    const combinedFederalPayrollTaxHourlyRate = Object.values(payrollTaxHourlyRates).reduce((sum, val) => sum + val, 0)
    const combinedFederalPayrollTaxCharged = Object.values(payrollTaxCharged).reduce((sum, val) => sum + val, 0)

    // Mandatory Worker Burden calculations
    const workerBurdenHourlyRates = Object.fromEntries([
      ...MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWage * ((mandatoryWorkerBurdenPercents[opt.id] || 0) / 100)
      ]),
      ...customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        workersWage * ((field.percent || 0) / 100)
      ])
    ])
    
    const workerBurdenCharged = Object.fromEntries([
      ...MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((mandatoryWorkerBurdenPercents[opt.id] || 0) / 100)
      ]),
      ...customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageCharged * ((field.percent || 0) / 100)
      ])
    ])
    
    const workerBurdenPercent = Object.values(mandatoryWorkerBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                customWorkerBurdenFields.reduce((sum, field) => sum + (field.percent || 0), 0)
    const workerBurdenHourlyRate = Object.values(workerBurdenHourlyRates).reduce((sum, val) => sum + val, 0)
    const workerBurdenChargedTotal = Object.values(workerBurdenCharged).reduce((sum, val) => sum + val, 0)

    // Total Mandatory Burden
    const totalMandatoryBurdenPercent = combinedFederalPayrollTaxPercent + workerBurdenPercent
    const totalMandatoryBurdenHourlyRate = combinedFederalPayrollTaxHourlyRate + workerBurdenHourlyRate
    const totalMandatoryBurdenCharged = combinedFederalPayrollTaxCharged + workerBurdenChargedTotal

    // Benefits Burden calculations
    const benefitsBurdenHourlyRates = Object.fromEntries(
      BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWage * ((benefitsBurdenPercents[opt.id] || 0) / 100)
      ])
    )
    
    const benefitsBurdenCharged = Object.fromEntries(
      BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((benefitsBurdenPercents[opt.id] || 0) / 100)
      ])
    )
    
    const benefitsBurdenPercent = Object.values(benefitsBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const benefitsBurdenHourlyRate = Object.values(benefitsBurdenHourlyRates).reduce((sum, val) => sum + val, 0)
    const benefitsBurdenChargedTotal = Object.values(benefitsBurdenCharged).reduce((sum, val) => sum + val, 0)

    // Additional Overheads calculations
    const additionalOverheadsHourlyRates = Object.fromEntries(
      ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        workersWage * ((additionalOverheadsPercents[opt.id] || 0) / 100)
      ])
    )
    
    const additionalOverheadsCharged = Object.fromEntries(
      ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((additionalOverheadsPercents[opt.id] || 0) / 100)
      ])
    )
    
    const additionalOverheadsPercent = Object.values(additionalOverheadsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const additionalOverheadsHourlyRate = Object.values(additionalOverheadsHourlyRates).reduce((sum, val) => sum + val, 0)
    const additionalOverheadsChargedTotal = Object.values(additionalOverheadsCharged).reduce((sum, val) => sum + val, 0)

    // Employee Costs calculations
    const employeeCostsHourlyRates = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        workersWage * ((employeeCostsPercents[opt.id] || 0) / 100)
      ]),
      ...customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        workersWage * ((cost.percent || 0) / 100)
      ])
    ])
    
    const employeeCostsCharged = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((employeeCostsPercents[opt.id] || 0) / 100)
      ]),
      ...customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        workersWageCharged * ((cost.percent || 0) / 100)
      ])
    ])
    
    const employeeCostsPercent = Object.values(employeeCostsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                 customEmployeeCosts.reduce((sum, cost) => sum + (cost.percent || 0), 0)
    const employeeCostsHourlyRate = Object.values(employeeCostsHourlyRates).reduce((sum, val) => sum + val, 0)
    const employeeCostsChargedTotal = Object.values(employeeCostsCharged).reduce((sum, val) => sum + val, 0)

    const divisionOverheadCharged = workersWageCharged * (divisionOverheadPercent / 100)
    const generalCompanyOverheadCharged = workersWageCharged * (generalCompanyOverheadPercent / 100)
    const profitCharged = workersWageCharged * (profitPercent / 100)

    // Total Labor Rate
    const totalLaborRate = workersWageCharged + 
                          totalMandatoryBurdenCharged +
                          benefitsBurdenChargedTotal +
                          additionalOverheadsChargedTotal +
                          employeeCostsChargedTotal +
                          divisionOverheadCharged +
                          generalCompanyOverheadCharged +
                          profitCharged

    return {
      hoursNotWorkedPercentages,
      nonBillableHoursPercentages,
      totalHoursNotWorked,
      totalNonBillableHours,
      totalHoursAvailable,
      totalHoursNotWorkedPercent,
      totalNonBillableHoursPercent,
      utilizationPercent,
      workersWageCharged,
      payrollTaxHourlyRates,
      payrollTaxCharged,
      combinedFederalPayrollTaxPercent,
      combinedFederalPayrollTaxHourlyRate,
      combinedFederalPayrollTaxCharged,
      workerBurdenHourlyRates,
      workerBurdenCharged,
      workerBurdenPercent,
      workerBurdenHourlyRate,
      workerBurdenChargedTotal,
      totalMandatoryBurdenPercent,
      totalMandatoryBurdenHourlyRate,
      totalMandatoryBurdenCharged,
      benefitsBurdenHourlyRates,
      benefitsBurdenCharged,
      benefitsBurdenPercent,
      benefitsBurdenHourlyRate,
      benefitsBurdenChargedTotal,
      additionalOverheadsHourlyRates,
      additionalOverheadsCharged,
      additionalOverheadsPercent,
      additionalOverheadsHourlyRate,
      additionalOverheadsChargedTotal,
      employeeCostsHourlyRates,
      employeeCostsCharged,
      employeeCostsPercent,
      employeeCostsHourlyRate,
      employeeCostsChargedTotal,
      divisionOverheadCharged,
      generalCompanyOverheadCharged,
      profitCharged,
      totalLaborRate
    }
  }, [
    hoursNotWorked,
    nonBillableHours,
    workersWage,
    mandatoryPayrollTaxPercents,
    mandatoryWorkerBurdenPercents,
    customPayrollTaxFields,
    customWorkerBurdenFields,
    benefitsBurdenPercents,
    additionalOverheadsPercents,
    employeeCostsPercents,
    customEmployeeCosts,
    divisionOverheadPercent,
    generalCompanyOverheadPercent,
    profitPercent
  ])

  const handleAddCustomHoursNotWorked = () => {
    if (newCustomHoursNotWorked.trim()) {
      setCustomHoursNotWorked(prev => [...prev, { id: `custom-${Date.now()}`, label: newCustomHoursNotWorked.trim() }])
      setNewCustomHoursNotWorked('')
    }
  }

  const handleAddCustomNonBillable = () => {
    if (newCustomNonBillable.trim()) {
      setCustomNonBillable(prev => [...prev, { id: `custom-${Date.now()}`, label: newCustomNonBillable.trim() }])
      setNewCustomNonBillable('')
    }
  }

  const handleAddCustomPayrollTax = () => {
    if (newCustomPayrollTax.name.trim() && newCustomPayrollTax.percent >= 0) {
      setCustomPayrollTaxFields(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomPayrollTax.name.trim(),
        percent: parseFloat(newCustomPayrollTax.percent) || 0
      }])
      setNewCustomPayrollTax({ name: '', percent: 0 })
    }
  }

  const handleAddCustomWorkerBurden = () => {
    if (newCustomWorkerBurden.name.trim() && newCustomWorkerBurden.percent >= 0) {
      setCustomWorkerBurdenFields(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomWorkerBurden.name.trim(),
        percent: parseFloat(newCustomWorkerBurden.percent) || 0
      }])
      setNewCustomWorkerBurden({ name: '', percent: 0 })
    }
  }

  const handleAddCustomEmployeeCost = () => {
    if (newCustomEmployeeCost.name.trim() && newCustomEmployeeCost.percent > 0) {
      setCustomEmployeeCosts(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomEmployeeCost.name.trim(),
        percent: parseFloat(newCustomEmployeeCost.percent) || 0
      }])
      setNewCustomEmployeeCost({ name: '', percent: 0 })
    }
  }

  const allHoursNotWorkedOptions = [...HOURS_NOT_WORKED_OPTIONS, ...customHoursNotWorked]
  const allNonBillableOptions = [...NON_BILLABLE_HOURS_OPTIONS, ...customNonBillable]

  // Ensure calculations object is always defined
  const safeCalculations = calculations || {
    hoursNotWorkedPercentages: {},
    nonBillableHoursPercentages: {},
    totalHoursNotWorked: 0,
    totalNonBillableHours: 0,
    totalHoursAvailable: PAID_CAPACITY,
    totalHoursNotWorkedPercent: 0,
    totalNonBillableHoursPercent: 0,
    utilizationPercent: 1,
    workersWageCharged: workersWage,
    payrollTaxHourlyRates: {},
    payrollTaxCharged: {},
    combinedFederalPayrollTaxPercent: 0,
    combinedFederalPayrollTaxHourlyRate: 0,
    combinedFederalPayrollTaxCharged: 0,
    workerBurdenHourlyRates: {},
    workerBurdenCharged: {},
    workerBurdenPercent: 0,
    workerBurdenHourlyRate: 0,
    workerBurdenChargedTotal: 0,
    totalMandatoryBurdenPercent: 0,
    totalMandatoryBurdenHourlyRate: 0,
      totalMandatoryBurdenCharged: 0,
      benefitsBurdenHourlyRates: {},
      benefitsBurdenCharged: {},
      benefitsBurdenPercent: 0,
      benefitsBurdenHourlyRate: 0,
      benefitsBurdenChargedTotal: 0,
      additionalOverheadsHourlyRates: {},
      additionalOverheadsCharged: {},
      additionalOverheadsPercent: 0,
      additionalOverheadsHourlyRate: 0,
      additionalOverheadsChargedTotal: 0,
      employeeCostsHourlyRates: {},
      employeeCostsCharged: {},
      employeeCostsPercent: 0,
      employeeCostsHourlyRate: 0,
      employeeCostsChargedTotal: 0,
    divisionOverheadCharged: 0,
    generalCompanyOverheadCharged: 0,
    profitCharged: 0,
    totalLaborRate: workersWage
  }

  return (
    <div className="min-h-screen bg-light py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-4xl font-bold text-primary mb-8 text-center">
          Building Your Labor Rate Calculator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Paid Capacity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-primary mb-4 border-b-2 border-primary pb-2">
                Step 1: Paid Capacity
              </h2>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Paid Capacity:</span>
                  <span className="text-xl font-bold text-primary">{PAID_CAPACITY.toLocaleString()} hours</span>
                </div>
              </div>

              {/* Hours Not Worked */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Hours Not Worked
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Hours Allocated</div>
                  <div className="text-center">Burden Per Hour Charged (%)</div>
                </div>
                
                <div className="space-y-1">
                  {allHoursNotWorkedOptions.map(option => {
                    const hours = parseFloat(hoursNotWorked[option.id]) || 0
                    const percent = safeCalculations.hoursNotWorkedPercentages[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-3 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="1"
                            value={hoursNotWorked[option.id] || ''}
                            onChange={(e) => setHoursNotWorked(prev => ({
                              ...prev,
                              [option.id]: e.target.value
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0"
                          />
                          <span className="text-gray-500 text-xs">hrs</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          {percent.toFixed(2)}%
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Hours Not Worked */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomHoursNotWorked}
                      onChange={(e) => setNewCustomHoursNotWorked(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomHoursNotWorked()}
                      placeholder="Custom category"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomHoursNotWorked}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Total PTO, Holidays and Sick Time */}
                <div className="mt-3 grid grid-cols-3 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Total PTO, Holidays and Sick Time</div>
                  <div className="text-center text-sm font-semibold text-gray-700">
                    {safeCalculations.totalHoursNotWorked} hrs
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    {safeCalculations.totalHoursNotWorkedPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Non-Billable Hours */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Non-Billable Hours
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Hours Allocated</div>
                  <div className="text-center">Burden Per Hour Charged (%)</div>
                </div>
                
                <div className="space-y-1">
                  {allNonBillableOptions.map(option => {
                    const hours = parseFloat(nonBillableHours[option.id]) || 0
                    const percent = safeCalculations.nonBillableHoursPercentages[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-3 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="1"
                            value={nonBillableHours[option.id] || ''}
                            onChange={(e) => setNonBillableHours(prev => ({
                              ...prev,
                              [option.id]: e.target.value
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0"
                          />
                          <span className="text-gray-500 text-xs">hrs</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          {percent.toFixed(2)}%
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Non-Billable */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomNonBillable}
                      onChange={(e) => setNewCustomNonBillable(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNonBillable()}
                      placeholder="Custom category"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomNonBillable}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Total Non-Billable Hours */}
                <div className="mt-3 grid grid-cols-3 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Total Non-Billable Hours</div>
                  <div className="text-center text-sm font-semibold text-gray-700">
                    {safeCalculations.totalNonBillableHours} hrs
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    {safeCalculations.totalNonBillableHoursPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Total Hours Available For Work */}
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className="text-gray-700 text-sm font-bold">Total Hours Available For Work</div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    {safeCalculations.totalHoursAvailable.toFixed(0)} hrs
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Mandatory Burden */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-primary mb-4 border-b-2 border-primary pb-2">
                Step 2: Mandatory Burden
              </h2>

              {/* Workers Wage Box */}
              <div className="mb-6 p-4 border-2 border-primary rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">
                  Workers Wage
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 font-medium">
                      Workers Wage:
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={workersWage}
                        onChange={(e) => setWorkersWage(parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right font-semibold"
                      />
                      <span className="text-gray-500">/hr</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                    <label className="text-gray-700 font-medium">
                      Burden/hour to charge:
                    </label>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        ${safeCalculations.workersWageCharged.toFixed(2)}/hr
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        = ${workersWage.toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Payroll Tax Burden */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Mandatory Payroll Tax Burden
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Burden Per Hour (%)</div>
                  <div className="text-center">Hourly Rate ($)</div>
                  <div className="text-center">Burden Per Hour Charged ($)</div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_PAYROLL_TAX_OPTIONS.map(option => {
                    const percent = mandatoryPayrollTaxPercents[option.id] || 0
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[option.id] || 0
                    const charged = safeCalculations.payrollTaxCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            step="0.01"
                            value={mandatoryPayrollTaxPercents[option.id] || ''}
                            onChange={(e) => setMandatoryPayrollTaxPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-1">%</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                  {customPayrollTaxFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] || 0
                    const charged = safeCalculations.payrollTaxCharged[`custom-${idx}`] || 0
                    return (
                      <div key={field.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {field.label}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={field.percent}
                            onChange={(e) => {
                              const updated = [...customPayrollTaxFields]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomPayrollTaxFields(updated)
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                          />
                          <span className="text-gray-500 text-xs">%</span>
                          <button
                            onClick={() => setCustomPayrollTaxFields(prev => prev.filter((_, i) => i !== idx))}
                            className="px-1 py-1 text-red-600 hover:bg-red-50 rounded text-sm ml-1"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Payroll Tax Field */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomPayrollTax.name}
                      onChange={(e) => setNewCustomPayrollTax(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Field name"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newCustomPayrollTax.percent || ''}
                      onChange={(e) => setNewCustomPayrollTax(prev => ({ ...prev, percent: e.target.value }))}
                      placeholder="%"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                    <button
                      onClick={handleAddCustomPayrollTax}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Combined Federal Payroll Tax */}
                <div className="mt-3 grid grid-cols-4 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Combined Federal Payroll Tax</div>
                  <div className="text-center text-sm font-semibold text-primary">
                    {safeCalculations.combinedFederalPayrollTaxPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    ${safeCalculations.combinedFederalPayrollTaxHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    ${safeCalculations.combinedFederalPayrollTaxCharged.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Mandatory Worker Burden */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Mandatory Worker Burden
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Burden Per Hour (%)</div>
                  <div className="text-center">Hourly Rate ($)</div>
                  <div className="text-center">Burden Per Hour Charged ($)</div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_WORKER_BURDEN_OPTIONS.map(option => {
                    const percent = mandatoryWorkerBurdenPercents[option.id] || 0
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[option.id] || 0
                    const charged = safeCalculations.workerBurdenCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            step="0.01"
                            value={mandatoryWorkerBurdenPercents[option.id] || ''}
                            onChange={(e) => setMandatoryWorkerBurdenPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-1">%</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                  {customWorkerBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] || 0
                    const charged = safeCalculations.workerBurdenCharged[`custom-${idx}`] || 0
                    return (
                      <div key={field.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {field.label}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={field.percent}
                            onChange={(e) => {
                              const updated = [...customWorkerBurdenFields]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomWorkerBurdenFields(updated)
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                          />
                          <span className="text-gray-500 text-xs">%</span>
                          <button
                            onClick={() => setCustomWorkerBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="px-1 py-1 text-red-600 hover:bg-red-50 rounded text-sm ml-1"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Worker Burden Field */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomWorkerBurden.name}
                      onChange={(e) => setNewCustomWorkerBurden(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Field name"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newCustomWorkerBurden.percent || ''}
                      onChange={(e) => setNewCustomWorkerBurden(prev => ({ ...prev, percent: e.target.value }))}
                      placeholder="%"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                    <button
                      onClick={handleAddCustomWorkerBurden}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Worker Burden Total */}
                <div className="mt-3 grid grid-cols-4 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Worker Burden</div>
                  <div className="text-center text-sm font-semibold text-primary">
                    {safeCalculations.workerBurdenPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    ${safeCalculations.workerBurdenHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    ${safeCalculations.workerBurdenChargedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Total Mandatory Burden */}
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="grid grid-cols-4 gap-2 items-center">
                  <div className="text-gray-700 text-sm font-bold">Total Mandatory Burden</div>
                  <div className="text-center text-sm font-bold text-primary">
                    {safeCalculations.totalMandatoryBurdenPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    ${safeCalculations.totalMandatoryBurdenHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    ${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Benefits Burden */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Benefits Burden
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Burden Per Hour (%)</div>
                  <div className="text-center">Hourly Rate ($)</div>
                  <div className="text-center">Burden Per Hour Charged ($)</div>
                </div>
                
                <div className="space-y-1">
                  {BENEFITS_BURDEN_OPTIONS.map(option => {
                    const percent = benefitsBurdenPercents[option.id] || 0
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[option.id] || 0
                    const charged = safeCalculations.benefitsBurdenCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            step="0.01"
                            value={benefitsBurdenPercents[option.id] || ''}
                            onChange={(e) => setBenefitsBurdenPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-1">%</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Benefits Burden Total */}
                <div className="mt-3 grid grid-cols-4 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Total Benefits Burden</div>
                  <div className="text-center text-sm font-semibold text-primary">
                    {safeCalculations.benefitsBurdenPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    ${safeCalculations.benefitsBurdenHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    ${safeCalculations.benefitsBurdenChargedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Additional Overheads */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Additional Overheads
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Burden Per Hour (%)</div>
                  <div className="text-center">Hourly Rate ($)</div>
                  <div className="text-center">Burden Per Hour Charged ($)</div>
                </div>
                
                <div className="space-y-1">
                  {ADDITIONAL_OVERHEADS_OPTIONS.map(option => {
                    const percent = additionalOverheadsPercents[option.id] || 0
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[option.id] || 0
                    const charged = safeCalculations.additionalOverheadsCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            step="0.01"
                            value={additionalOverheadsPercents[option.id] || ''}
                            onChange={(e) => setAdditionalOverheadsPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-1">%</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Additional Overheads Total */}
                <div className="mt-3 grid grid-cols-4 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Total Additional Overheads</div>
                  <div className="text-center text-sm font-semibold text-primary">
                    {safeCalculations.additionalOverheadsPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    ${safeCalculations.additionalOverheadsHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    ${safeCalculations.additionalOverheadsChargedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Employee Costs */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Employee Costs
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                  <div></div>
                  <div className="text-center">Burden Per Hour (%)</div>
                  <div className="text-center">Hourly Rate ($)</div>
                  <div className="text-center">Burden Per Hour Charged ($)</div>
                </div>
                
                <div className="space-y-1">
                  {EMPLOYEE_COSTS_OPTIONS.map(option => {
                    const percent = employeeCostsPercents[option.id] || 0
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[option.id] || 0
                    const charged = safeCalculations.employeeCostsCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {option.label}
                        </label>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            step="0.01"
                            value={employeeCostsPercents[option.id] || ''}
                            onChange={(e) => setEmployeeCostsPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-1">%</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                  {customEmployeeCosts.map((cost, idx) => {
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0
                    const charged = safeCalculations.employeeCostsCharged[`custom-${idx}`] || 0
                    return (
                      <div key={cost.id} className="grid grid-cols-4 gap-2 items-center p-2 border border-gray-200 rounded-lg bg-gray-50">
                        <label className="text-gray-700 text-sm font-medium">
                          {cost.label}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={cost.percent}
                            onChange={(e) => {
                              const updated = [...customEmployeeCosts]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomEmployeeCosts(updated)
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                          />
                          <span className="text-gray-500 text-xs">%</span>
                          <button
                            onClick={() => setCustomEmployeeCosts(prev => prev.filter((_, i) => i !== idx))}
                            className="px-1 py-1 text-red-600 hover:bg-red-50 rounded text-sm ml-1"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-sm font-semibold text-primary">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Employee Cost */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomEmployeeCost.name}
                      onChange={(e) => setNewCustomEmployeeCost(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Cost name"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newCustomEmployeeCost.percent || ''}
                      onChange={(e) => setNewCustomEmployeeCost(prev => ({ ...prev, percent: e.target.value }))}
                      placeholder="%"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                    <button
                      onClick={handleAddCustomEmployeeCost}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Employee Costs Total */}
                <div className="mt-3 grid grid-cols-4 gap-2 items-center p-2 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-gray-700 text-sm font-semibold">Total Employee Costs</div>
                  <div className="text-center text-sm font-semibold text-primary">
                    {safeCalculations.employeeCostsPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-sm font-bold text-gray-700">
                    ${safeCalculations.employeeCostsHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-sm font-bold text-primary">
                    ${safeCalculations.employeeCostsChargedTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Results - Burden Per Hour Charged */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-primary mb-4 border-b-2 border-primary pb-2">
                Step 3: Results - Burden Per Hour Charged
              </h2>

              {/* Key Calculation Display */}
              <div className="mb-4 p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-600">Workers Wage (Earned)</div>
                    <div className="text-xl font-bold text-primary">${workersWage.toFixed(2)}/hr</div>
                  </div>
                  <div className="border-t border-primary/20 pt-2">
                    <div className="text-xs text-gray-600">Workers Wage (Charged)</div>
                    <div className="text-xl font-bold text-primary">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                      <div className="text-xs text-gray-500 mt-1">
                        = ${workersWage.toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Detailed Breakdown
                </h3>
                
                <div className="space-y-3 text-sm">
                  {/* Workers Wage */}
                  <div className="border-b border-gray-200 pb-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Workers Wage</span>
                      <span className="font-bold text-primary">${safeCalculations.workersWageCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Mandatory Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs">Mandatory Burden</h4>
                    <div className="ml-2 space-y-1">
                      {/* Mandatory Payroll Tax Burden items */}
                      {MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => {
                        const charged = safeCalculations.payrollTaxCharged[opt.id] || 0
                        return (
                          <div key={opt.id} className="flex justify-between text-xs">
                            <span className="text-gray-600">{opt.label}:</span>
                            <span className="font-semibold text-primary">${charged.toFixed(2)}/hr</span>
                          </div>
                        )
                      })}
                      {/* Mandatory Worker Burden items */}
                      {MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => {
                        const charged = safeCalculations.workerBurdenCharged[opt.id] || 0
                        return (
                          <div key={opt.id} className="flex justify-between text-xs">
                            <span className="text-gray-600">{opt.label}:</span>
                            <span className="font-semibold text-primary">${charged.toFixed(2)}/hr</span>
                          </div>
                        )
                      })}
                      <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t border-gray-200 mt-1">
                        <span className="text-xs">Total:</span>
                        <span className="text-primary text-xs">${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs">Benefits Burden</h4>
                    <div className="ml-2 space-y-1">
                      {BENEFITS_BURDEN_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{opt.label}:</span>
                          <span className="font-semibold text-primary">
                            ${(safeCalculations.benefitsBurdenCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Overheads */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs">Additional Overheads</h4>
                    <div className="ml-2 space-y-1">
                      {ADDITIONAL_OVERHEADS_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{opt.label}:</span>
                          <span className="font-semibold text-primary">
                            ${(safeCalculations.additionalOverheadsCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employee Costs */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs">Employee Costs</h4>
                    <div className="ml-2 space-y-1">
                      {EMPLOYEE_COSTS_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{opt.label}:</span>
                          <span className="font-semibold text-primary">
                            ${(safeCalculations.employeeCostsCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customEmployeeCosts.map((cost, idx) => (
                        <div key={cost.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{cost.label}:</span>
                          <span className="font-semibold text-primary">
                            ${(safeCalculations.employeeCostsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Division Overhead */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-gray-700 text-xs">Division Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({divisionOverheadPercent}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs">${safeCalculations.divisionOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* General Company Overhead */}
                  <div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-gray-700 text-xs">General Company Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({generalCompanyOverheadPercent}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs">${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Profit */}
                  <div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-gray-700 text-xs">Profit</span>
                        <span className="text-xs text-gray-500 ml-1">({profitPercent}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs">${safeCalculations.profitCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Labor Rate */}
              <div className="bg-primary/10 rounded-lg p-4 mb-4 border-2 border-primary">
                <h3 className="text-base font-semibold text-primary mb-2">
                  Total Labor Rate
                </h3>
                <div className="text-3xl font-bold text-primary">
                  ${safeCalculations.totalLaborRate.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Rate to charge for this employee's time
                </div>
              </div>

              {/* Step 3 Inputs */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral mb-3">
                  Adjust Overhead & Profit
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 text-sm font-medium">Division Overhead:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={divisionOverheadPercent}
                        onChange={(e) => setDivisionOverheadPercent(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 text-sm font-medium">General Company Overhead:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={generalCompanyOverheadPercent}
                        onChange={(e) => setGeneralCompanyOverheadPercent(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 text-sm font-medium">Profit:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={profitPercent}
                        onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Print Button */}
              <div className="mt-4">
                <button
                  onClick={() => window.print()}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Print Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaborRateCalculator
