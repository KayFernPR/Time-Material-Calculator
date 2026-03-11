import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

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
  { id: 'drive-time', label: 'Drive Time', tooltip: 'Not billed to job' },
  { id: 'rework', label: 'Rework' },
  { id: 'administration', label: 'Admin' },
  { id: 'downtime-cleaning', label: 'Downtime/\nCleaning' },
  { id: 'minimum-weekly-hours', label: 'Minimum Weekly Hours' }
]

// Step 2: Mandatory Payroll Tax Burden options
const MANDATORY_PAYROLL_TAX_OPTIONS = [
  { id: 'federal-taxes', label: 'Federal\nTaxes', defaultPercent: 0 },
  { id: 'social-security', label: 'Social\nSecurity', defaultPercent: 0 },
  { id: 'medicare', label: 'Medicare', defaultPercent: 0 }
]

// Step 2: Mandatory Worker Burden options
const MANDATORY_WORKER_BURDEN_OPTIONS = [
  { id: 'state-unemployment', label: 'State\nUnemployment', defaultPercent: 0 },
  { id: 'federal-unemployment', label: 'Federal\nUnemployment', defaultPercent: 0 },
  { id: 'workers-compensation', label: 'Workers\nCompensation', defaultPercent: 0 }
]

// Step 2: Benefits Burden options
const BENEFITS_BURDEN_OPTIONS = [
  { id: 'health-insurance', label: 'Health Insurance Premiums', defaultPercent: 0 },
  { id: 'retirement-match', label: 'Retirement Match', defaultPercent: 0 }
]

// Step 2: Additional Overheads options
const ADDITIONAL_OVERHEADS_OPTIONS = [
  { id: 'uniforms', label: 'Uniforms', defaultPercent: 0 },
  { id: 'boot-allowance', label: 'Boot Allowance', defaultPercent: 0 },
  { id: 'phone-data', label: 'Phone & Data', defaultPercent: 0 },
  { id: 'computer-tablet', label: 'Computer / Tablet & Software', defaultPercent: 0 }
]

// Step 2: Employee Costs options
const EMPLOYEE_COSTS_OPTIONS = [
  { id: 'training-certifications', label: 'Training & Certifications', defaultPercent: 0 },
  { id: 'christmas-bonus', label: 'Christmas Bonus', defaultPercent: 0 },
  { id: 'performance-bonus', label: 'Performance Bonus', defaultPercent: 0 },
  { id: 'non-billable-tools', label: 'Other: Non-Billable Tools', defaultPercent: 0 }
]

const PAID_CAPACITY = 2080 // 52 weeks * 40 hours

// Shows (?) tooltip only when the label is truncated (e.g. shows "..."). User can hover to read full label.
// Tooltip is rendered via portal (like Division Overhead) so it always sits on top and is never clipped.
function TruncatedLabelWithTooltip({ label, fullText, labelClassName, wrapperClassName = 'flex items-center gap-1.5 min-w-0 overflow-hidden' }) {
  const labelRef = useRef(null)
  const triggerRef = useRef(null)
  const [showIcon, setShowIcon] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    const check = () => setShowIcon(el.scrollHeight > el.clientHeight)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [label])
  const updateTooltipPos = () => {
    const el = triggerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
  }
  return (
    <div className={wrapperClassName}>
      <label ref={labelRef} className={labelClassName}>
        {label}
      </label>
      {showIcon && (
        <div
          ref={triggerRef}
          className="relative flex-shrink-0"
          onMouseEnter={() => { updateTooltipPos(); setTooltipOpen(true) }}
          onMouseLeave={() => setTooltipOpen(false)}
        >
          <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
      {tooltipOpen && createPortal(
        <div
          role="tooltip"
          className="w-48 max-w-[220px] p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-normal pointer-events-none"
          style={{
            position: 'fixed',
            left: tooltipPos.left,
            top: tooltipPos.top - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999
          }}
        >
          {fullText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>,
        document.body
      )}
        </div>
      )}
    </div>
  )
}

function LaborRateCalculator() {
  // Step 1: Hours data
  const [hoursNotWorked, setHoursNotWorked] = useState({})
  const [nonBillableHours, setNonBillableHours] = useState({})
  const [customHoursNotWorked, setCustomHoursNotWorked] = useState([])
  const [newCustomHoursNotWorked, setNewCustomHoursNotWorked] = useState('')
  const [customNonBillable, setCustomNonBillable] = useState([])
  const [newCustomNonBillable, setNewCustomNonBillable] = useState('')
  
  // Step 2: Employee earned data
  const [workersWage, setWorkersWage] = useState('')
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
  const [customBenefitsBurdenFields, setCustomBenefitsBurdenFields] = useState([])
  const [newCustomBenefitsBurden, setNewCustomBenefitsBurden] = useState({ name: '', percent: 0 })
  const [additionalOverheadsPercents, setAdditionalOverheadsPercents] = useState(
    Object.fromEntries(ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customAdditionalOverheadsFields, setCustomAdditionalOverheadsFields] = useState([])
  const [newCustomAdditionalOverheads, setNewCustomAdditionalOverheads] = useState({ name: '', percent: 0 })
  const [employeeCostsPercents, setEmployeeCostsPercents] = useState(
    Object.fromEntries(EMPLOYEE_COSTS_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customEmployeeCosts, setCustomEmployeeCosts] = useState([])
  const [newCustomEmployeeCost, setNewCustomEmployeeCost] = useState({ name: '', percent: 0 })
  
  // Step 3: Overhead and Profit
  const [divisionOverheadPercent, setDivisionOverheadPercent] = useState(0)
  const [generalCompanyOverheadPercent, setGeneralCompanyOverheadPercent] = useState(0)
  const [profitPercent, setProfitPercent] = useState(0)

  // Scroll behavior: Independent scrolling with visual indicators
  const step1Ref = useRef(null)
  const step2Ref = useRef(null)
  const step3MandatoryRef = useRef(null)
  const step3Ref = useRef(null)
  const divisionOverheadTooltipTriggerRef = useRef(null)
  const [divisionOverheadTooltipOpen, setDivisionOverheadTooltipOpen] = useState(false)
  const [divisionOverheadTooltipPos, setDivisionOverheadTooltipPos] = useState({ top: 0, left: 0 })

  const updateDivisionOverheadTooltipPos = () => {
    const el = divisionOverheadTooltipTriggerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setDivisionOverheadTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
  }

  useEffect(() => {
    if (!divisionOverheadTooltipOpen) return
    const scrollEl = step3MandatoryRef.current
    const onScrollOrResize = () => updateDivisionOverheadTooltipPos()
    if (scrollEl) scrollEl.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [divisionOverheadTooltipOpen])

  // Auto-scroll inputs into view when focused
  useEffect(() => {
    const handleInputFocus = (e) => {
      if (e.target.tagName === 'INPUT') {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }, 100)
      }
    }

    document.addEventListener('focusin', handleInputFocus)
    return () => {
      document.removeEventListener('focusin', handleInputFocus)
    }
  }, [])

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
    const workersWageNum = parseFloat(workersWage) || 0
    const workersWageCharged = utilizationPercent > 0 ? workersWageNum / utilizationPercent : 0

    // Mandatory Payroll Tax Burden calculations
    const payrollTaxHourlyRates = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        workersWageNum * ((mandatoryPayrollTaxPercents[opt.id] || 0) / 100)
      ]),
      ...customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageNum * ((field.percent || 0) / 100)
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
        workersWageNum * ((mandatoryWorkerBurdenPercents[opt.id] || 0) / 100)
      ]),
      ...customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageNum * ((field.percent || 0) / 100)
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
    const benefitsBurdenHourlyRates = Object.fromEntries([
      ...BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWageNum * ((benefitsBurdenPercents[opt.id] || 0) / 100)
      ]),
      ...customBenefitsBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageNum * ((field.percent || 0) / 100)
      ])
    ])
    
    const benefitsBurdenCharged = Object.fromEntries([
      ...BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((benefitsBurdenPercents[opt.id] || 0) / 100)
      ]),
      ...customBenefitsBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageCharged * ((field.percent || 0) / 100)
      ])
    ])
    
    const benefitsBurdenPercent = Object.values(benefitsBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
      customBenefitsBurdenFields.reduce((sum, field) => sum + (field.percent || 0), 0)
    const benefitsBurdenHourlyRate = Object.values(benefitsBurdenHourlyRates).reduce((sum, val) => sum + val, 0)
    const benefitsBurdenChargedTotal = Object.values(benefitsBurdenCharged).reduce((sum, val) => sum + val, 0)

    // Additional Overheads calculations
    const additionalOverheadsHourlyRates = Object.fromEntries([
      ...ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        workersWageNum * ((additionalOverheadsPercents[opt.id] || 0) / 100)
      ]),
      ...customAdditionalOverheadsFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageNum * ((field.percent || 0) / 100)
      ])
    ])
    
    const additionalOverheadsCharged = Object.fromEntries([
      ...ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        workersWageCharged * ((additionalOverheadsPercents[opt.id] || 0) / 100)
      ]),
      ...customAdditionalOverheadsFields.map((field, idx) => [
        `custom-${idx}`,
        workersWageCharged * ((field.percent || 0) / 100)
      ])
    ])
    
    const additionalOverheadsPercent = Object.values(additionalOverheadsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
      customAdditionalOverheadsFields.reduce((sum, field) => sum + (field.percent || 0), 0)
    const additionalOverheadsHourlyRate = Object.values(additionalOverheadsHourlyRates).reduce((sum, val) => sum + val, 0)
    const additionalOverheadsChargedTotal = Object.values(additionalOverheadsCharged).reduce((sum, val) => sum + val, 0)

    // Employee Costs calculations
    const employeeCostsHourlyRates = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        workersWageNum * ((employeeCostsPercents[opt.id] || 0) / 100)
      ]),
      ...customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        workersWageNum * ((cost.percent || 0) / 100)
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

    // Cost base before overhead & profit (wage + all burdens) — Excel applies overhead & profit % to this total
    const costBaseBeforeOverheadAndProfit =
      workersWageCharged +
      totalMandatoryBurdenCharged +
      benefitsBurdenChargedTotal +
      additionalOverheadsChargedTotal +
      employeeCostsChargedTotal

    // Division Overhead & General Company Overhead: Chgd ($) = Burden/hour to charge × Brdn (%), same as Profit
    const divisionOverheadHourlyRate = workersWageNum * (divisionOverheadPercent / 100)
    const divisionOverheadCharged = workersWageCharged * (divisionOverheadPercent / 100)
    const generalCompanyOverheadHourlyRate = workersWageNum * (generalCompanyOverheadPercent / 100)
    const generalCompanyOverheadCharged = workersWageCharged * (generalCompanyOverheadPercent / 100)

    // Profit Chgd ($) = Burden/hour to charge × Brdn (%)  (Burden/hour to charge = workersWageCharged)
    const profitHourlyRate = workersWageNum * (profitPercent / 100)
    const profitCharged = workersWageCharged * (profitPercent / 100)

    // Total Labor Rate = Workers Wage (Charged) + Total Mandatory Burden + Benefits Total +
    // Additional Overheads Total + Employee Costs Total + Division Overhead + General Company Overhead + Profit
    const totalLaborRateRaw =
      workersWageCharged +                    // Workers Wage (Charged)
      totalMandatoryBurdenCharged +          // Total Mandatory Burden
      benefitsBurdenChargedTotal +            // Benefits Total
      additionalOverheadsChargedTotal +        // Additional Overheads Total
      employeeCostsChargedTotal +             // Employee Costs Total
      divisionOverheadCharged +               // Division Overhead
      generalCompanyOverheadCharged +         // General Company Overhead
      profitCharged                           // Profit
    const totalLaborRate = Number.isFinite(totalLaborRateRaw)
      ? Math.round(totalLaborRateRaw * 100) / 100
      : 0

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
      divisionOverheadHourlyRate,
      divisionOverheadCharged,
      generalCompanyOverheadHourlyRate,
      generalCompanyOverheadCharged,
      profitHourlyRate,
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
    customBenefitsBurdenFields,
    additionalOverheadsPercents,
    customAdditionalOverheadsFields,
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
    if (newCustomPayrollTax.name.trim()) {
      setCustomPayrollTaxFields(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomPayrollTax.name.trim(),
        percent: parseFloat(newCustomPayrollTax.percent) || 0
      }])
      setNewCustomPayrollTax({ name: '', percent: 0 })
    }
  }

  const handleAddCustomWorkerBurden = () => {
    if (newCustomWorkerBurden.name.trim()) {
      setCustomWorkerBurdenFields(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomWorkerBurden.name.trim(),
        percent: parseFloat(newCustomWorkerBurden.percent) || 0
      }])
      setNewCustomWorkerBurden({ name: '', percent: 0 })
    }
  }

  const handleAddCustomBenefitsBurden = () => {
    if (newCustomBenefitsBurden.name.trim()) {
      setCustomBenefitsBurdenFields(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomBenefitsBurden.name.trim(),
        percent: parseFloat(newCustomBenefitsBurden.percent) || 0
      }])
      setNewCustomBenefitsBurden({ name: '', percent: 0 })
    }
  }

  const handleAddCustomAdditionalOverheads = () => {
    if (newCustomAdditionalOverheads.name.trim()) {
      setCustomAdditionalOverheadsFields(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newCustomAdditionalOverheads.name.trim(),
        percent: parseFloat(newCustomAdditionalOverheads.percent) || 0
      }])
      setNewCustomAdditionalOverheads({ name: '', percent: 0 })
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
    workersWageCharged: parseFloat(workersWage) || 0,
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
      divisionOverheadHourlyRate: 0,
      divisionOverheadCharged: 0,
      generalCompanyOverheadHourlyRate: 0,
      generalCompanyOverheadCharged: 0,
      profitHourlyRate: 0,
      profitCharged: 0,
      totalLaborRate: parseFloat(workersWage) || 0
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-light py-4 sm:py-6 lg:py-8 overflow-x-hidden">
      <div className="container mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-6 lg:mb-8 text-center">
          Building Your Labor Rate Calculator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[repeat(4,minmax(0,1fr))] gap-[5px] min-w-0">
          {/* Step 1: Paid Capacity */}
          <div className="lg:col-span-1 min-w-0 w-full">
            <div 
              ref={step1Ref}
              className="bg-white rounded-lg shadow-lg pt-6 pr-4 pb-6 pl-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto scroll-smooth min-w-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-2xl font-bold text-primary mb-4 border-b-2 border-primary pb-2">
                Step 1: Paid Capacity
              </h2>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Paid Capacity:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{PAID_CAPACITY.toLocaleString()} hours</div>
                    <div className="text-xs text-gray-500 mt-1">
                      = 52 weeks × 40 hours/week
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours Not Worked */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Hours Not Worked
                </h3>
                
                {/* Table Header — label column flexible, hours & % compact; headers centered over hrs and % */}
                <div className="grid gap-1 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-2 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                  <div className="min-w-0 px-1"></div>
                  <div className="flex flex-col items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[6px]">
                    <div>Hours</div>
                    <div>Allocated</div>
                  </div>
                  <div className="flex flex-col items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[6px]">
                    <div>Burden</div>
                    <div>Chg (%)</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {allHoursNotWorkedOptions.map(option => {
                    const hours = parseFloat(hoursNotWorked[option.id]) || 0
                    const percent = safeCalculations.hoursNotWorkedPercentages[option.id] || 0
                    return (
                      <div key={option.id} className="grid gap-1 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                        <label className="text-gray-700 text-xs font-medium break-words line-clamp-2 leading-tight min-w-0 px-1">
                          {option.label}
                        </label>
                        <div className="flex w-full items-center justify-center gap-1 min-w-0 px-1">
                          <input
                            type="number"
                            step="1"
                            value={hoursNotWorked[option.id] || ''}
                            onChange={(e) => setHoursNotWorked(prev => ({
                              ...prev,
                              [option.id]: e.target.value
                            }))}
                            className="w-12 px-1.5 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0"
                          />
                          <span className="text-gray-500 text-xs">hrs</span>
                        </div>
                        <div className="w-full text-center text-xs font-semibold text-primary px-1 min-w-0">
                          {percent.toFixed(2)}%
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Hours Not Worked */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomHoursNotWorked}
                      onChange={(e) => setNewCustomHoursNotWorked(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomHoursNotWorked()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomHoursNotWorked}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Total PTO, Holidays and Sick Time */}
                <div className="mt-3 grid gap-1 items-center p-2 border-2 border-primary rounded-lg bg-primary/5 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                  <div className="text-gray-700 text-xs font-semibold break-words leading-tight min-w-0 px-1">Total PTO, Holidays and Sick Time</div>
                  <div className="w-full text-center text-xs font-semibold text-gray-700 px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalHoursNotWorked} hrs
                  </div>
                  <div className="w-full text-center text-xs font-bold text-primary px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalHoursNotWorkedPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Non-Billable Hours */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Non-Billable Hours
                </h3>
                
                {/* Table Header — label column flexible, hours & % compact; headers centered over hrs and % */}
                <div className="grid gap-1 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-2 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                  <div className="min-w-0 px-1"></div>
                  <div className="flex flex-col items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[6px]">
                    <div>Hours</div>
                    <div>Allocated</div>
                  </div>
                  <div className="flex flex-col items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[6px]">
                    <div>Burden</div>
                    <div>Chg (%)</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {allNonBillableOptions.map(option => {
                    const hours = parseFloat(nonBillableHours[option.id]) || 0
                    const percent = safeCalculations.nonBillableHoursPercentages[option.id] || 0
                    return (
                      <div key={option.id} className={`grid gap-1 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 grid-cols-[1fr_4.5rem_4rem] ${option.tooltip ? 'overflow-visible' : ''}`}>
                        <div className={`flex items-center gap-2 min-w-0 px-1 ${option.tooltip ? 'overflow-visible' : 'overflow-hidden'}`}>
                          <label className="text-gray-700 text-xs font-medium whitespace-pre-line break-words line-clamp-2 leading-tight min-w-0 overflow-hidden">
                            {option.label}
                          </label>
                          {option.tooltip && (
                            <div className="relative group flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-normal opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                {option.tooltip}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex w-full items-center justify-center gap-1 min-w-0 px-1">
                          <input
                            type="number"
                            step="1"
                            value={nonBillableHours[option.id] || ''}
                            onChange={(e) => setNonBillableHours(prev => ({
                              ...prev,
                              [option.id]: e.target.value
                            }))}
                            className="w-12 px-1.5 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0"
                          />
                          <span className="text-gray-500 text-xs">hrs</span>
                        </div>
                        <div className="w-full text-center text-xs font-semibold text-primary px-1 min-w-0">
                            {percent.toFixed(2)}%
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add Custom Non-Billable */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomNonBillable}
                      onChange={(e) => setNewCustomNonBillable(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNonBillable()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomNonBillable}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Total Non-Billable Hours */}
                <div className="mt-3 grid gap-1 items-center p-2 border-2 border-primary rounded-lg bg-primary/5 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                  <div className="text-gray-700 text-xs font-semibold break-words leading-tight min-w-0 px-1">Total Non-Billable Hours</div>
                  <div className="w-full text-center text-xs font-semibold text-gray-700 px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalNonBillableHours} hrs
                  </div>
                  <div className="w-full text-center text-xs font-bold text-primary px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalNonBillableHoursPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Total Hours Available For Work */}
              <div className="mt-3 grid gap-1 items-center p-2 border-2 border-primary rounded-lg bg-primary/10 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                <div className="text-gray-700 text-xs font-bold break-words leading-tight min-w-0 px-1">Total Hours Available For Work</div>
                <div className="w-full text-center text-xs font-bold text-gray-700 px-1 min-w-0 translate-x-[8px]">
                  {safeCalculations.totalHoursAvailable.toFixed(0)} hrs
                </div>
                <div className="w-full text-center text-xs font-bold text-primary px-1 min-w-0 translate-x-[8px]">
                  {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Wage Burden */}
          <div className="lg:col-span-1 min-w-0 w-full min-w-[320px]">
            <div 
              ref={step2Ref}
              className="bg-white rounded-lg shadow-lg pt-6 pr-5 pb-6 pl-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-auto overflow-y-auto scroll-smooth min-w-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-2xl font-bold text-primary mb-4 border-b-2 border-primary pb-2">
                Step 2: Wage Burden
              </h2>

              {/* Workers Wage Box */}
              <div className="mb-6 p-4 border-2 border-primary rounded-lg min-w-0">
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
                        onChange={(e) => setWorkersWage(e.target.value)}
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
                      <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                        = ${(parseFloat(workersWage) || 0).toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
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
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 -ml-[10px] text-xs">
                  <div className="min-w-0 ml-[10px]"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn %</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_PAYROLL_TAX_OPTIONS.map(option => {
                    const percent = mandatoryPayrollTaxPercents[option.id] || 0
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[option.id] || 0
                    const charged = safeCalculations.payrollTaxCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <TruncatedLabelWithTooltip
                          label={option.label}
                          fullText={option.label.replace(/\n/g, ' ')}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-pre-line overflow-hidden leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden ml-[10px]"
                        />
                        <div className="flex items-center justify-center min-w-0 px-0.5 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={mandatoryPayrollTaxPercents[option.id] || ''}
                            onChange={(e) => setMandatoryPayrollTaxPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                  {customPayrollTaxFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] ?? 0
                    const charged = safeCalculations.payrollTaxCharged[`custom-${idx}`] ?? 0
                    return (
                      <div key={field.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden ml-[10px]">
                          <TruncatedLabelWithTooltip
                            label={field.label}
                            fullText={field.label}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-pre-line overflow-hidden leading-tight text-xs line-clamp-2"
                            wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomPayrollTaxFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-center min-w-0 px-1 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={field.percent || ''}
                            onChange={(e) => {
                              const updated = [...customPayrollTaxFields]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomPayrollTaxFields(updated)
                            }}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${Number(hourlyRate).toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${Number(charged).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Payroll Tax Field */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomPayrollTax.name}
                      onChange={(e) => setNewCustomPayrollTax(prev => ({ ...prev, name: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomPayrollTax()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPayrollTax}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Payroll Tax Burden */}
                <div className="mt-3 grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0 -ml-[10px]">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 pr-1 overflow-hidden ml-[10px] break-words line-clamp-2" title="Payroll Tax Burden">Payroll Tax Burden</div>
                  <div className="text-center text-xs font-semibold text-primary px-0.5">
                    {safeCalculations.combinedFederalPayrollTaxPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                    ${safeCalculations.combinedFederalPayrollTaxHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
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
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 -ml-[10px] text-xs">
                  <div className="min-w-0 ml-[10px]"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn %</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_WORKER_BURDEN_OPTIONS.map(option => {
                    const percent = mandatoryWorkerBurdenPercents[option.id] || 0
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[option.id] || 0
                    const charged = safeCalculations.workerBurdenCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <TruncatedLabelWithTooltip
                          label={option.label}
                          fullText={option.label.replace(/\n/g, ' ')}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-pre-line overflow-hidden leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden ml-[10px]"
                        />
                        <div className="flex items-center justify-center min-w-0 px-0.5 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={mandatoryWorkerBurdenPercents[option.id] || ''}
                            onChange={(e) => setMandatoryWorkerBurdenPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                  {customWorkerBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] ?? 0
                    const charged = safeCalculations.workerBurdenCharged[`custom-${idx}`] ?? 0
                    return (
                      <div key={field.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden ml-[10px]">
                          <TruncatedLabelWithTooltip
                            label={field.label}
                            fullText={field.label}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-pre-line overflow-hidden leading-tight text-xs line-clamp-2"
                            wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomWorkerBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-center min-w-0 px-1 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={field.percent || ''}
                            onChange={(e) => {
                              const updated = [...customWorkerBurdenFields]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomWorkerBurdenFields(updated)
                            }}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${Number(hourlyRate).toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${Number(charged).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Worker Burden Field */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomWorkerBurden.name}
                      onChange={(e) => setNewCustomWorkerBurden(prev => ({ ...prev, name: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomWorkerBurden()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomWorkerBurden}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Worker Burden Total */}
                <div className="mt-3 grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0 -ml-[10px]">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 pr-1 overflow-hidden ml-[10px] break-words line-clamp-2" title="Worker Burden">Worker Burden</div>
                  <div className="text-center text-xs font-semibold text-primary px-0.5">
                    {safeCalculations.workerBurdenPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                    ${safeCalculations.workerBurdenHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                    ${safeCalculations.workerBurdenChargedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Total Wage Burden */}
              <div className="mt-3 grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border-2 border-primary rounded-lg bg-primary/10 min-w-0 -ml-[10px]">
                <div className="text-gray-700 text-xs font-bold min-w-0 pr-1 overflow-hidden ml-[10px] break-words line-clamp-2" title="Total Wage Burden">Total Wage Burden</div>
                <div className="text-center text-xs font-bold text-primary px-0.5">
                  {safeCalculations.totalMandatoryBurdenPercent.toFixed(2)}%
                </div>
                <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                  ${safeCalculations.totalMandatoryBurdenHourlyRate.toFixed(2)}
                </div>
                <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                  ${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Mandatory Burden */}
          <div className="lg:col-span-1 min-w-0 w-full min-w-[300px]">
            <div 
              ref={step3MandatoryRef}
              className="bg-white rounded-lg shadow-lg pt-6 pr-5 pb-6 pl-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-auto overflow-y-auto scroll-smooth min-w-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
                Step 3: Mandatory Burden
              </h2>

              {/* Benefits Burden */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Benefits Burden
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 text-xs">
                  <div className="min-w-0"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                  <div className="min-w-0"></div>
                </div>
                
                <div className="space-y-1">
                  {BENEFITS_BURDEN_OPTIONS.map(option => {
                    const percent = benefitsBurdenPercents[option.id] || 0
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[option.id] || 0
                    const charged = safeCalculations.benefitsBurdenCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <TruncatedLabelWithTooltip
                          label={option.label}
                          fullText={option.label.replace(/\n/g, ' ')}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal overflow-hidden pr-1 leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                        />
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={benefitsBurdenPercents[option.id] || ''}
                            onChange={(e) => setBenefitsBurdenPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                        <div></div>
                      </div>
                    )
                  })}
                  {customBenefitsBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[`custom-${idx}`] || 0
                    const charged = safeCalculations.benefitsBurdenCharged[`custom-${idx}`] || 0
                    return (
                      <div key={field.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <TruncatedLabelWithTooltip
                          label={field.label}
                          fullText={field.label}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal overflow-hidden pr-1 leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                        />
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={field.percent}
                            onChange={(e) => {
                              const updated = [...customBenefitsBurdenFields]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomBenefitsBurdenFields(updated)
                            }}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end w-8 shrink-0" aria-hidden="true">
                          <button
                            type="button"
                            onClick={() => setCustomBenefitsBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Benefits Burden */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomBenefitsBurden.name}
                      onChange={(e) => setNewCustomBenefitsBurden(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomBenefitsBurden}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Benefits Burden Total */}
                <div className="mt-3 grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden">Total Benefits Burden</div>
                  <div className="text-center text-xs font-semibold text-primary px-0.5">
                    {safeCalculations.benefitsBurdenPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                    ${safeCalculations.benefitsBurdenHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                    ${safeCalculations.benefitsBurdenChargedTotal.toFixed(2)}
                  </div>
                  <div></div>
                </div>
              </div>

              {/* Additional Overheads */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Additional Overheads
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 text-xs">
                  <div className="min-w-0"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                  <div className="min-w-0"></div>
                </div>
                
                <div className="space-y-1">
                  {ADDITIONAL_OVERHEADS_OPTIONS.map(option => {
                    const percent = additionalOverheadsPercents[option.id] || 0
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[option.id] || 0
                    const charged = safeCalculations.additionalOverheadsCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <TruncatedLabelWithTooltip
                          label={option.label}
                          fullText={option.label.replace(/\n/g, ' ')}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal overflow-hidden pr-1 leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                        />
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={additionalOverheadsPercents[option.id] || ''}
                            onChange={(e) => setAdditionalOverheadsPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                        <div></div>
                      </div>
                    )
                  })}
                  {customAdditionalOverheadsFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[`custom-${idx}`] || 0
                    const charged = safeCalculations.additionalOverheadsCharged[`custom-${idx}`] || 0
                    return (
                      <div key={field.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <TruncatedLabelWithTooltip
                          label={field.label}
                          fullText={field.label}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal overflow-hidden pr-1 leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                        />
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={field.percent}
                            onChange={(e) => {
                              const updated = [...customAdditionalOverheadsFields]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomAdditionalOverheadsFields(updated)
                            }}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end w-8 shrink-0" aria-hidden="true">
                          <button
                            type="button"
                            onClick={() => setCustomAdditionalOverheadsFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Additional Overheads */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomAdditionalOverheads.name}
                      onChange={(e) => setNewCustomAdditionalOverheads(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomAdditionalOverheads}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Additional Overheads Total */}
                <div className="mt-3 grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden break-words line-clamp-2" title="Total Additional Overheads">Total Additional Overheads</div>
                  <div className="text-center text-xs font-semibold text-primary px-0.5">
                    {safeCalculations.additionalOverheadsPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                    ${safeCalculations.additionalOverheadsHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                    ${safeCalculations.additionalOverheadsChargedTotal.toFixed(2)}
                  </div>
                  <div></div>
                </div>
              </div>

              {/* Employee Costs */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Employee Costs
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 text-xs">
                  <div className="min-w-0"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                  <div className="min-w-0"></div>
                </div>
                
                <div className="space-y-1">
                  {EMPLOYEE_COSTS_OPTIONS.map(option => {
                    const percent = employeeCostsPercents[option.id] || 0
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[option.id] || 0
                    const charged = safeCalculations.employeeCostsCharged[option.id] || 0
                    return (
                      <div key={option.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <TruncatedLabelWithTooltip
                          label={option.label}
                          fullText={option.label.replace(/\n/g, ' ')}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal overflow-hidden pr-1 leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                        />
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={employeeCostsPercents[option.id] || ''}
                            onChange={(e) => setEmployeeCostsPercents(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                        <div></div>
                      </div>
                    )
                  })}
                  {customEmployeeCosts.map((cost, idx) => {
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0
                    const charged = safeCalculations.employeeCostsCharged[`custom-${idx}`] || 0
                    return (
                      <div key={cost.id} className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem_2rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <TruncatedLabelWithTooltip
                          label={cost.label}
                          fullText={cost.label}
                          labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal overflow-hidden pr-1 leading-tight text-xs line-clamp-2"
                          wrapperClassName="flex items-center gap-1.5 min-w-0 overflow-hidden"
                        />
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={cost.percent}
                            onChange={(e) => {
                              const updated = [...customEmployeeCosts]
                              updated[idx].percent = parseFloat(e.target.value) || 0
                              setCustomEmployeeCosts(updated)
                            }}
                            className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                          ${hourlyRate.toFixed(2)}
                        </div>
                        <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                          ${charged.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end w-8 shrink-0" aria-hidden="true">
                          <button
                            type="button"
                            onClick={() => setCustomEmployeeCosts(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Employee Cost */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 min-w-0 flex-wrap items-center">
                    <input
                      type="text"
                      value={newCustomEmployeeCost.name}
                      onChange={(e) => setNewCustomEmployeeCost(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                <div className="mt-3 grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden break-words line-clamp-2" title="Total Employee Costs">Total Employee Costs</div>
                  <div className="text-center text-xs font-semibold text-primary px-0.5">
                    {safeCalculations.employeeCostsPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                    ${safeCalculations.employeeCostsHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                    ${safeCalculations.employeeCostsChargedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Division Overhead */}
              <div className="mb-6 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Division Overhead
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0">
                  <div className="min-w-0"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                </div>
                
                <div className="space-y-1">
                  <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <label className="text-gray-700 text-xs font-medium break-words min-w-0 line-clamp-2 leading-snug">
                        Division Overhead
                      </label>
                      <div
                        ref={divisionOverheadTooltipTriggerRef}
                        className="relative flex-shrink-0"
                        onMouseEnter={() => { updateDivisionOverheadTooltipPos(); setDivisionOverheadTooltipOpen(true) }}
                        onMouseLeave={() => setDivisionOverheadTooltipOpen(false)}
                      >
                        <svg 
                          className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={divisionOverheadPercent || ''}
                        onChange={(e) => setDivisionOverheadPercent(parseFloat(e.target.value) || 0)}
                        className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                    </div>
                    <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                      ${safeCalculations.divisionOverheadHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                      ${safeCalculations.divisionOverheadCharged.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* General Company Overhead */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  General Company Overhead
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0">
                  <div className="min-w-0"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                </div>
                
                <div className="space-y-1">
                  <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <label className="text-gray-700 text-xs font-medium break-words min-w-0 overflow-hidden pr-2">
                      General Company Overhead
                    </label>
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={generalCompanyOverheadPercent || ''}
                        onChange={(e) => setGeneralCompanyOverheadPercent(parseFloat(e.target.value) || 0)}
                        className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                    </div>
                    <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                      ${safeCalculations.generalCompanyOverheadHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                      ${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Profit
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0">
                  <div className="min-w-0"></div>
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap pl-0.5 pr-2">Chgd ($)</div>
                </div>
                
                <div className="space-y-1">
                  <div className="grid grid-cols-[minmax(5rem,1fr)_3.25rem_3.25rem_3.5rem] gap-1.5 items-center p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <label className="text-gray-700 text-xs font-medium break-words min-w-0 overflow-hidden pr-2">
                      Profit
                    </label>
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={profitPercent || ''}
                        onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                        className="w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                    </div>
                    <div className="text-center text-xs font-semibold text-gray-700 whitespace-nowrap px-0.5">
                      ${safeCalculations.profitHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-semibold text-primary whitespace-nowrap pl-0.5 pr-2">
                      ${safeCalculations.profitCharged.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Results - Burden / Hour Charged */}
          <div className="lg:col-span-1 min-w-0 w-full">
            <div 
              ref={step3Ref}
              className="bg-white rounded-lg shadow-lg p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto scroll-smooth min-w-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
                Step 4: Results - Burden / Hour Charged
              </h2>

              {/* Key Calculation Display */}
              <div className="mb-3 p-3 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="space-y-1.5">
                  <div>
                    <div className="text-xs text-gray-600">Workers Wage (Earned)</div>
                    <div className="text-lg font-bold text-primary">${(parseFloat(workersWage) || 0).toFixed(2)}/hr</div>
                  </div>
                  <div className="border-t border-primary/20 pt-1.5">
                    <div className="text-xs text-gray-600">Workers Wage (Charged)</div>
                    <div className="text-lg font-bold text-primary">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                      <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                        = ${(parseFloat(workersWage) || 0).toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <h3 className="text-sm font-semibold text-neutral mb-2">
                  Detailed Breakdown
                </h3>
                
                <div className="space-y-3 text-sm">
                  {/* Step 1: Paid Capacity - Hours not worked & non-billable (includes custom) */}
                  {(allHoursNotWorkedOptions.some(opt => (parseFloat(hoursNotWorked[opt.id]) || 0) > 0) || allNonBillableOptions.some(opt => (parseFloat(nonBillableHours[opt.id]) || 0) > 0)) && (
                    <>
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-1 text-xs">Paid Capacity (Step 1)</h4>
                        <div className="ml-2 space-y-1">
                          {allHoursNotWorkedOptions.map(opt => {
                            const hrs = parseFloat(hoursNotWorked[opt.id]) || 0
                            if (hrs <= 0) return null
                            const pct = safeCalculations.hoursNotWorkedPercentages[opt.id] || 0
                            return (
                              <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                                <span className="text-gray-600 min-w-0 truncate">{opt.label.replace(/\n/g, ' ')}:</span>
                                <span className="shrink-0">{hrs} hrs ({pct.toFixed(1)}%)</span>
                              </div>
                            )
                          })}
                          {allNonBillableOptions.map(opt => {
                            const hrs = parseFloat(nonBillableHours[opt.id]) || 0
                            if (hrs <= 0) return null
                            const pct = safeCalculations.nonBillableHoursPercentages[opt.id] || 0
                            return (
                              <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                                <span className="text-gray-600 min-w-0 truncate">{opt.label.replace(/\n/g, ' ')}:</span>
                                <span className="shrink-0">{hrs} hrs ({pct.toFixed(1)}%)</span>
                              </div>
                            )
                          })}
                          <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t border-gray-200 mt-1 gap-2 min-w-0">
                            <span className="text-xs min-w-0">Billable utilization:</span>
                            <span className="text-primary text-xs shrink-0">{(safeCalculations.utilizationPercent * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-b border-gray-200 pb-2" />
                    </>
                  )}

                  {/* Workers Wage */}
                  <div className="border-b border-gray-200 pb-2">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-700 min-w-0 truncate">Workers Wage</span>
                      <span className="font-bold text-primary shrink-0">${safeCalculations.workersWageCharged.toFixed(2)}/hr</span>
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
                          <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                            <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                            <span className="font-semibold text-primary shrink-0">${charged.toFixed(2)}/hr</span>
                          </div>
                        )
                      })}
                      {customPayrollTaxFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">${(safeCalculations.payrollTaxCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</span>
                        </div>
                      ))}
                      {/* Mandatory Worker Burden items */}
                      {MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => {
                        const charged = safeCalculations.workerBurdenCharged[opt.id] || 0
                        return (
                          <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                            <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                            <span className="font-semibold text-primary shrink-0">${charged.toFixed(2)}/hr</span>
                          </div>
                        )
                      })}
                      {customWorkerBurdenFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">${(safeCalculations.workerBurdenCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t border-gray-200 mt-1 gap-2 min-w-0">
                        <span className="text-xs min-w-0">Total:</span>
                        <span className="text-primary text-xs shrink-0">${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs">Benefits Burden</h4>
                    <div className="ml-2 space-y-1">
                      {BENEFITS_BURDEN_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.benefitsBurdenCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customBenefitsBurdenFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.benefitsBurdenCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
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
                        <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.additionalOverheadsCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customAdditionalOverheadsFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.additionalOverheadsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
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
                        <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.employeeCostsCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customEmployeeCosts.map((cost, idx) => (
                        <div key={cost.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{cost.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.employeeCostsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Division Overhead */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">Division Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({divisionOverheadPercent}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.divisionOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* General Company Overhead */}
                  <div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">General Company Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({generalCompanyOverheadPercent}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Profit */}
                  <div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">Profit</span>
                        <span className="text-xs text-gray-500 ml-1">({profitPercent}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.profitCharged.toFixed(2)}/hr</span>
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
      {divisionOverheadTooltipOpen && createPortal(
        <div
          role="tooltip"
          className="w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            position: 'fixed',
            left: divisionOverheadTooltipPos.left,
            top: divisionOverheadTooltipPos.top - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999
          }}
        >
          <div className="font-semibold mb-1">Division Overhead includes:</div>
          <div>Management, Non-Billable and General Warehouse Space, Non-Billable Vehicles, General Overheads</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default LaborRateCalculator
