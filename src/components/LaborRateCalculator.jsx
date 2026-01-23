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

// Step 2: Mandatory Burden options
const MANDATORY_BURDEN_OPTIONS = [
  { id: 'social-security', label: 'Social Security', defaultPercent: 6.20 },
  { id: 'medicare', label: 'Medicare', defaultPercent: 1.45 },
  { id: 'ohio-unemployment', label: 'Ohio Unemployment', defaultPercent: 2.70 },
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
  const [currentStep, setCurrentStep] = useState(1)
  
  // Step 1: Hours data
  const [hoursNotWorked, setHoursNotWorked] = useState({})
  const [nonBillableHours, setNonBillableHours] = useState({})
  const [customNonBillable, setCustomNonBillable] = useState([])
  const [newCustomNonBillable, setNewCustomNonBillable] = useState('')
  
  // Step 2: Employee earned data
  const [workersWage, setWorkersWage] = useState(40.00)
  const [mandatoryBurdenPercents, setMandatoryBurdenPercents] = useState(
    Object.fromEntries(MANDATORY_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
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
    // Step 1 calculations
    const totalHoursNotWorked = Object.values(hoursNotWorked).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalNonBillableHours = Object.values(nonBillableHours).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalHoursAvailable = PAID_CAPACITY - totalHoursNotWorked - totalNonBillableHours
    const utilizationPercent = totalHoursAvailable / PAID_CAPACITY

    // Step 2 calculations - Workers Wage Charged is the key rate
    const workersWageCharged = utilizationPercent > 0 ? workersWage / utilizationPercent : 0

    // Mandatory Burden calculations
    const combinedFederalPayrollTax = (mandatoryBurdenPercents['social-security'] || 0) + 
                                      (mandatoryBurdenPercents['medicare'] || 0)
    const workerBurden = (mandatoryBurdenPercents['ohio-unemployment'] || 0) + 
                        (mandatoryBurdenPercents['federal-unemployment'] || 0) + 
                        (mandatoryBurdenPercents['workers-compensation'] || 0)
    const totalMandatoryBurdenPercent = combinedFederalPayrollTax + workerBurden

    // Calculate all "Burden Per Hour Charged" values
    const mandatoryBurdenCharged = {
      'social-security': workersWageCharged * ((mandatoryBurdenPercents['social-security'] || 0) / 100),
      'medicare': workersWageCharged * ((mandatoryBurdenPercents['medicare'] || 0) / 100),
      'combined-federal': workersWageCharged * (combinedFederalPayrollTax / 100),
      'ohio-unemployment': workersWageCharged * ((mandatoryBurdenPercents['ohio-unemployment'] || 0) / 100),
      'federal-unemployment': workersWageCharged * ((mandatoryBurdenPercents['federal-unemployment'] || 0) / 100),
      'workers-compensation': workersWageCharged * ((mandatoryBurdenPercents['workers-compensation'] || 0) / 100),
      'worker-burden': workersWageCharged * (workerBurden / 100),
      'total': workersWageCharged * (totalMandatoryBurdenPercent / 100)
    }

    const benefitsBurdenCharged = Object.fromEntries(
      BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((benefitsBurdenPercents[opt.id] || 0) / 100)
      ])
    )

    const additionalOverheadsCharged = Object.fromEntries(
      ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((additionalOverheadsPercents[opt.id] || 0) / 100)
      ])
    )

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

    const divisionOverheadCharged = workersWageCharged * (divisionOverheadPercent / 100)
    const generalCompanyOverheadCharged = workersWageCharged * (generalCompanyOverheadPercent / 100)
    const profitCharged = workersWageCharged * (profitPercent / 100)

    // Total Labor Rate
    const totalLaborRate = workersWageCharged + 
                          mandatoryBurdenCharged.total +
                          Object.values(benefitsBurdenCharged).reduce((sum, val) => sum + val, 0) +
                          Object.values(additionalOverheadsCharged).reduce((sum, val) => sum + val, 0) +
                          Object.values(employeeCostsCharged).reduce((sum, val) => sum + val, 0) +
                          divisionOverheadCharged +
                          generalCompanyOverheadCharged +
                          profitCharged

    return {
      totalHoursNotWorked,
      totalNonBillableHours,
      totalHoursAvailable,
      utilizationPercent,
      workersWageCharged,
      mandatoryBurdenCharged,
      benefitsBurdenCharged,
      additionalOverheadsCharged,
      employeeCostsCharged,
      divisionOverheadCharged,
      generalCompanyOverheadCharged,
      profitCharged,
      totalLaborRate
    }
  }, [
    hoursNotWorked,
    nonBillableHours,
    workersWage,
    mandatoryBurdenPercents,
    benefitsBurdenPercents,
    additionalOverheadsPercents,
    employeeCostsPercents,
    customEmployeeCosts,
    divisionOverheadPercent,
    generalCompanyOverheadPercent,
    profitPercent
  ])

  const handleAddCustomNonBillable = () => {
    if (newCustomNonBillable.trim()) {
      setCustomNonBillable(prev => [...prev, { id: `custom-${Date.now()}`, label: newCustomNonBillable.trim() }])
      setNewCustomNonBillable('')
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

  const allNonBillableOptions = [...NON_BILLABLE_HOURS_OPTIONS, ...customNonBillable]

  return (
    <div className="min-h-screen bg-light py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold text-primary mb-8 text-center">
          Building Your Labor Rate Calculator
        </h1>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    currentStep >= step
                      ? 'bg-primary text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-neutral font-semibold">
            Step {currentStep} of 3
          </div>
        </div>

        {/* Step 1: Paid Capacity - Hours Not Worked and Non-Billable Hours */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">
              Step 1: Paid Capacity
            </h2>
            <p className="text-neutral mb-6">
              Enter hours for each category. Paid Capacity is 2,080 hours (52 weeks × 40 hours).
            </p>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Paid Capacity:</span>
                <span className="text-xl font-bold text-primary">{PAID_CAPACITY.toLocaleString()} hours</span>
              </div>
            </div>

            {/* Hours Not Worked */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-neutral mb-4">
                Hours Not Worked
              </h3>
              <div className="space-y-3">
                {HOURS_NOT_WORKED_OPTIONS.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <label className="text-gray-700 font-medium flex-1">
                      {option.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={hoursNotWorked[option.id] || ''}
                        onChange={(e) => setHoursNotWorked(prev => ({
                          ...prev,
                          [option.id]: e.target.value
                        }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="0"
                      />
                      <span className="text-gray-500">hours</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-Billable Hours */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-neutral mb-4">
                Non-Billable Hours
              </h3>
              <div className="space-y-3">
                {allNonBillableOptions.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <label className="text-gray-700 font-medium flex-1">
                      {option.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={nonBillableHours[option.id] || ''}
                        onChange={(e) => setNonBillableHours(prev => ({
                          ...prev,
                          [option.id]: e.target.value
                        }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="0"
                      />
                      <span className="text-gray-500">hours</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Non-Billable */}
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Custom Non-Billable Hours</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCustomNonBillable}
                    onChange={(e) => setNewCustomNonBillable(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNonBillable()}
                    placeholder="Enter custom category name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleAddCustomNonBillable}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6 p-4 bg-primary/10 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Hours Not Worked:</span>
                  <span className="font-semibold">{calculations.totalHoursNotWorked} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Non-Billable Hours:</span>
                  <span className="font-semibold">{calculations.totalNonBillableHours} hours</span>
                </div>
                <div className="flex justify-between border-t border-primary/20 pt-2 mt-2">
                  <span className="font-semibold text-gray-700">Total Hours Available For Work:</span>
                  <span className="font-bold text-primary text-lg">{calculations.totalHoursAvailable.toFixed(0)} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Utilization Percentage:</span>
                  <span className="font-semibold text-primary">{(calculations.utilizationPercent * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Next: Step 2
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Burden Per Hour Employee Earned */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">
              Step 2: Burden Per Hour Employee Earned
            </h2>
            <p className="text-neutral mb-6">
              Enter hourly wage and percentages for each burden category.
            </p>

            {/* Workers Wage */}
            <div className="mb-8 p-4 border-2 border-primary rounded-lg">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Workers Wage
              </h3>
              <div className="flex items-center justify-between">
                <label className="text-gray-700 font-medium text-lg">
                  Hourly Rate:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={workersWage}
                    onChange={(e) => setWorkersWage(parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-lg font-semibold"
                  />
                  <span className="text-gray-500">/hr</span>
                </div>
              </div>
            </div>

            {/* Mandatory Burden */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral mb-4">
                Mandatory Burden
              </h3>
              <div className="space-y-3">
                {MANDATORY_BURDEN_OPTIONS.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <label className="text-gray-700 font-medium flex-1">
                      {option.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={mandatoryBurdenPercents[option.id] || ''}
                        onChange={(e) => setMandatoryBurdenPercents(prev => ({
                          ...prev,
                          [option.id]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 w-8">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits Burden */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral mb-4">
                Benefits Burden
              </h3>
              <div className="space-y-3">
                {BENEFITS_BURDEN_OPTIONS.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <label className="text-gray-700 font-medium flex-1">
                      {option.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={benefitsBurdenPercents[option.id] || ''}
                        onChange={(e) => setBenefitsBurdenPercents(prev => ({
                          ...prev,
                          [option.id]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 w-8">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Overheads */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral mb-4">
                Additional Overheads
              </h3>
              <div className="space-y-3">
                {ADDITIONAL_OVERHEADS_OPTIONS.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <label className="text-gray-700 font-medium flex-1">
                      {option.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={additionalOverheadsPercents[option.id] || ''}
                        onChange={(e) => setAdditionalOverheadsPercents(prev => ({
                          ...prev,
                          [option.id]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 w-8">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Costs */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral mb-4">
                Employee Costs
              </h3>
              <div className="space-y-3">
                {EMPLOYEE_COSTS_OPTIONS.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <label className="text-gray-700 font-medium flex-1">
                      {option.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={employeeCostsPercents[option.id] || ''}
                        onChange={(e) => setEmployeeCostsPercents(prev => ({
                          ...prev,
                          [option.id]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 w-8">%</span>
                    </div>
                  </div>
                ))}
                {customEmployeeCosts.map((cost, idx) => (
                  <div key={cost.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <label className="text-gray-700 font-medium flex-1">
                      {cost.label}:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={cost.percent}
                        onChange={(e) => {
                          const updated = [...customEmployeeCosts]
                          updated[idx].percent = parseFloat(e.target.value) || 0
                          setCustomEmployeeCosts(updated)
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                      />
                      <span className="text-gray-500 w-8">%</span>
                      <button
                        onClick={() => setCustomEmployeeCosts(prev => prev.filter((_, i) => i !== idx))}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Employee Cost */}
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Custom Employee Cost</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCustomEmployeeCost.name}
                    onChange={(e) => setNewCustomEmployeeCost(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Cost name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newCustomEmployeeCost.percent || ''}
                    onChange={(e) => setNewCustomEmployeeCost(prev => ({ ...prev, percent: e.target.value }))}
                    placeholder="%"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  />
                  <button
                    onClick={handleAddCustomEmployeeCost}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Next: Step 3
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results - Burden Per Hour Charged */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">
              Step 3: Results - Burden Per Hour Charged
            </h2>
            <p className="text-neutral mb-6">
              Calculated rates based on your inputs and utilization percentage.
            </p>

            {/* Key Calculation Display */}
            <div className="mb-6 p-4 bg-primary/10 rounded-lg border-2 border-primary">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Workers Wage (Employee Earned)</div>
                  <div className="text-2xl font-bold text-primary">${workersWage.toFixed(2)}/hr</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Workers Wage (Charged)</div>
                  <div className="text-2xl font-bold text-primary">${calculations.workersWageCharged.toFixed(2)}/hr</div>
                  <div className="text-xs text-gray-500 mt-1">
                    = ${workersWage.toFixed(2)} ÷ {(calculations.utilizationPercent * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-neutral mb-4">
                Detailed Breakdown
              </h3>
              
              <div className="space-y-4">
                {/* Workers Wage */}
                <div className="border-b border-gray-200 pb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Workers Wage</span>
                    <span className="font-bold text-primary">${calculations.workersWageCharged.toFixed(2)}/hr</span>
                  </div>
                </div>

                {/* Mandatory Burden */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Mandatory Burden</h4>
                  <div className="ml-4 space-y-1">
                    {MANDATORY_BURDEN_OPTIONS.map(opt => {
                      const charged = calculations.mandatoryBurdenCharged[opt.id]
                      if (!charged) return null
                      return (
                        <div key={opt.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{opt.label}:</span>
                          <span className="font-semibold text-primary">${charged.toFixed(2)}/hr</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t border-gray-200 mt-2">
                      <span>Total Mandatory Burden:</span>
                      <span className="text-primary">${calculations.mandatoryBurdenCharged.total.toFixed(2)}/hr</span>
                    </div>
                  </div>
                </div>

                {/* Benefits Burden */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Benefits Burden</h4>
                  <div className="ml-4 space-y-1">
                    {BENEFITS_BURDEN_OPTIONS.map(opt => (
                      <div key={opt.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{opt.label}:</span>
                        <span className="font-semibold text-primary">
                          ${(calculations.benefitsBurdenCharged[opt.id] || 0).toFixed(2)}/hr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Overheads */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Additional Overheads</h4>
                  <div className="ml-4 space-y-1">
                    {ADDITIONAL_OVERHEADS_OPTIONS.map(opt => (
                      <div key={opt.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{opt.label}:</span>
                        <span className="font-semibold text-primary">
                          ${(calculations.additionalOverheadsCharged[opt.id] || 0).toFixed(2)}/hr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employee Costs */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Employee Costs</h4>
                  <div className="ml-4 space-y-1">
                    {EMPLOYEE_COSTS_OPTIONS.map(opt => (
                      <div key={opt.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{opt.label}:</span>
                        <span className="font-semibold text-primary">
                          ${(calculations.employeeCostsCharged[opt.id] || 0).toFixed(2)}/hr
                        </span>
                      </div>
                    ))}
                    {customEmployeeCosts.map((cost, idx) => (
                      <div key={cost.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{cost.label}:</span>
                        <span className="font-semibold text-primary">
                          ${(calculations.employeeCostsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Division Overhead */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-700">Division Overhead</span>
                      <span className="text-sm text-gray-500 ml-2">({divisionOverheadPercent}%)</span>
                    </div>
                    <span className="font-bold text-primary">${calculations.divisionOverheadCharged.toFixed(2)}/hr</span>
                  </div>
                </div>

                {/* General Company Overhead */}
                <div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-700">General Company Overhead</span>
                      <span className="text-sm text-gray-500 ml-2">({generalCompanyOverheadPercent}%)</span>
                    </div>
                    <span className="font-bold text-primary">${calculations.generalCompanyOverheadCharged.toFixed(2)}/hr</span>
                  </div>
                </div>

                {/* Profit */}
                <div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-700">Profit</span>
                      <span className="text-sm text-gray-500 ml-2">({profitPercent}%)</span>
                    </div>
                    <span className="font-bold text-primary">${calculations.profitCharged.toFixed(2)}/hr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Labor Rate */}
            <div className="bg-primary/10 rounded-lg p-6 mb-6 border-2 border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">
                Total Labor Rate
              </h3>
              <div className="text-4xl font-bold text-primary">
                ${calculations.totalLaborRate.toFixed(2)}/hr
              </div>
              <div className="text-sm text-gray-600 mt-2">
                This is the rate you should charge for this employee's time
              </div>
            </div>

            {/* Step 3 Inputs */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-neutral mb-4">
                Adjust Overhead & Profit Percentages
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 font-medium">Division Overhead:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={divisionOverheadPercent}
                      onChange={(e) => setDivisionOverheadPercent(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                    <span className="text-gray-500 w-8">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 font-medium">General Company Overhead:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={generalCompanyOverheadPercent}
                      onChange={(e) => setGeneralCompanyOverheadPercent(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                    <span className="text-gray-500 w-8">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 font-medium">Profit:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={profitPercent}
                      onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                    <span className="text-gray-500 w-8">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => {
                  // Export functionality - could print or download as CSV
                  window.print()
                }}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Print Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LaborRateCalculator
