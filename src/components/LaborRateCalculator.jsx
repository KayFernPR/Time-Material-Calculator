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
  { id: 'federal-taxes', label: 'Federal Taxes', defaultPercent: 0 },
  { id: 'social-security', label: 'Social Security', defaultPercent: 0 },
  { id: 'medicare', label: 'Medicare', defaultPercent: 0 }
]

// Step 2: Mandatory Worker Burden options
const MANDATORY_WORKER_BURDEN_OPTIONS = [
  { id: 'state-unemployment', label: 'State Unemployment', defaultPercent: 0 },
  { id: 'federal-unemployment', label: 'Federal Unemployment', defaultPercent: 0 },
  { id: 'workers-compensation', label: 'Workers Compensation', defaultPercent: 0 }
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

/** Spend/yr ($): annual cost = earned burden $/hr × paid hours/year (2080). */
function annualSpendFromEarnedHourly(earnedHrly) {
  return earnedHrly * PAID_CAPACITY
}

/**
 * Brdn % from earned burden $/hr vs workers wage. Uses 6 decimal places so values
 * typed in Spend/yr ($) round-trip (1 decimal was snapping e.g. $200 → 0.2% → $166.40).
 */
function burdenPercentFromEarnedHourly(earnedHrly, workersWage) {
  const w = parseFloat(workersWage) || 0
  if (w <= 0 || !Number.isFinite(earnedHrly)) return 0
  const pct = (earnedHrly / w) * 100
  return Math.round(pct * 1e6) / 1e6
}

/** $/hr burden amounts: 6 decimals so Spend/yr ($) = Hrly × 2080 round-trips after Brdn % precision. */
function roundBurdenDollar(x) {
  return Math.round(x * 1e6) / 1e6
}

/** Two-decimal display for Brdn % inputs; full precision stays in state until user edits this field. */
function formatBrdnPercentForDisplay(stored) {
  if (stored === '' || stored === undefined || stored === null) return ''
  const n = parseFloat(stored)
  if (Number.isNaN(n)) return ''
  return (Math.round(n * 100) / 100).toFixed(2)
}

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

  // Local editing state for Hrly ($) / Spend/yr ($) so user can type decimals without value snapping on each keystroke
  const [editingDollarField, setEditingDollarField] = useState(null) // { section, rowId, field: 'hrly'|'chgd', value: string }
  const [editingBrdnField, setEditingBrdnField] = useState(null) // { key: string, value: string }

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
    // Hrly = wage × (Brdn%/100); Spend/yr = Hrly × 2080; charged $/hr (Step 4) = workersWageCharged × (Brdn%/100)
    const payrollTaxHourlyRates = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(mandatoryPayrollTaxPercents[opt.id]) || 0) / 100))
      ]),
      ...customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const payrollTaxCharged = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(mandatoryPayrollTaxPercents[opt.id]) || 0) / 100))
      ]),
      ...customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const combinedFederalPayrollTaxPercent = Object.values(mandatoryPayrollTaxPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                             customPayrollTaxFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const combinedFederalPayrollTaxHourlyRate = Object.values(payrollTaxHourlyRates).reduce((sum, val) => sum + val, 0)
    const combinedFederalPayrollTaxCharged = Object.values(payrollTaxCharged).reduce((sum, val) => sum + val, 0)

    // Mandatory Worker Burden calculations
    const workerBurdenHourlyRates = Object.fromEntries([
      ...MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(mandatoryWorkerBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const workerBurdenCharged = Object.fromEntries([
      ...MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(mandatoryWorkerBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const workerBurdenPercent = Object.values(mandatoryWorkerBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                customWorkerBurdenFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
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
        roundBurdenDollar(workersWageNum * ((parseFloat(benefitsBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...customBenefitsBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const benefitsBurdenCharged = Object.fromEntries([
      ...BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(benefitsBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...customBenefitsBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const benefitsBurdenPercent = Object.values(benefitsBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
      customBenefitsBurdenFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const benefitsBurdenHourlyRate = Object.values(benefitsBurdenHourlyRates).reduce((sum, val) => sum + val, 0)
    const benefitsBurdenChargedTotal = Object.values(benefitsBurdenCharged).reduce((sum, val) => sum + val, 0)

    // Additional Overheads calculations
    const additionalOverheadsHourlyRates = Object.fromEntries([
      ...ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(additionalOverheadsPercents[opt.id]) || 0) / 100))
      ]),
      ...customAdditionalOverheadsFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const additionalOverheadsCharged = Object.fromEntries([
      ...ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(additionalOverheadsPercents[opt.id]) || 0) / 100))
      ]),
      ...customAdditionalOverheadsFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const additionalOverheadsPercent = Object.values(additionalOverheadsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
      customAdditionalOverheadsFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const additionalOverheadsHourlyRate = Object.values(additionalOverheadsHourlyRates).reduce((sum, val) => sum + val, 0)
    const additionalOverheadsChargedTotal = Object.values(additionalOverheadsCharged).reduce((sum, val) => sum + val, 0)

    // Employee Costs calculations
    const employeeCostsHourlyRates = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(employeeCostsPercents[opt.id]) || 0) / 100))
      ]),
      ...customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(cost.percent) || 0) / 100))
      ])
    ])
    
    const employeeCostsCharged = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(employeeCostsPercents[opt.id]) || 0) / 100))
      ]),
      ...customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(cost.percent) || 0) / 100))
      ])
    ])
    
    const employeeCostsPercent = Object.values(employeeCostsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                 customEmployeeCosts.reduce((sum, cost) => sum + (parseFloat(cost.percent) || 0), 0)
    const employeeCostsHourlyRate = Object.values(employeeCostsHourlyRates).reduce((sum, val) => sum + val, 0)
    const employeeCostsChargedTotal = Object.values(employeeCostsCharged).reduce((sum, val) => sum + val, 0)

    // Cost base before overhead & profit (total worker cost: wage charged + all burdens)
    const costBaseBeforeOverheadAndProfit =
      workersWageCharged +
      totalMandatoryBurdenCharged +
      benefitsBurdenChargedTotal +
      additionalOverheadsChargedTotal +
      employeeCostsChargedTotal

    // Margin formula: amount so that (base + amount) has margin% as the amount's share of the total.
    // (base + amount) * (1 - margin/100) = base  =>  amount = base * (margin/100) / (1 - margin/100)
    const marginAmount = (base, marginPercent) => {
      if (marginPercent <= 0) return 0
      const m = marginPercent / 100
      if (m >= 1) return 0 // avoid division by zero
      return base * m / (1 - m)
    }

    // Division Overhead: margin on total worker cost (cost base)
    const divisionOverheadCharged = marginAmount(costBaseBeforeOverheadAndProfit, parseFloat(divisionOverheadPercent) || 0)
    const divisionOverheadHourlyRate = divisionOverheadCharged
    const totalAfterDivisionOverhead = costBaseBeforeOverheadAndProfit + divisionOverheadCharged

    // General Company Overhead: margin on total cost including division overhead
    const generalCompanyOverheadCharged = marginAmount(totalAfterDivisionOverhead, parseFloat(generalCompanyOverheadPercent) || 0)
    const generalCompanyOverheadHourlyRate = generalCompanyOverheadCharged
    const totalAfterGeneralOverhead = totalAfterDivisionOverhead + generalCompanyOverheadCharged

    // Profit: margin on total of all costs including division and general overhead
    const profitCharged = marginAmount(totalAfterGeneralOverhead, parseFloat(profitPercent) || 0)
    const profitHourlyRate = profitCharged

    // Total Labor Rate = full charge including all costs, overheads, and profit
    const totalLaborRateRaw = totalAfterGeneralOverhead + profitCharged
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
      totalLaborRate,
      costBaseBeforeOverheadAndProfit,
      totalAfterDivisionOverhead,
      totalAfterGeneralOverhead
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
      totalLaborRate: parseFloat(workersWage) || 0,
      costBaseBeforeOverheadAndProfit: 0,
      totalAfterDivisionOverhead: 0,
      totalAfterGeneralOverhead: 0
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-light py-4 sm:py-6 lg:py-8 overflow-x-hidden print:bg-white print:min-h-0 print:py-4">
      <div className="container mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 max-w-7xl print:max-w-none">
        <div className="flex flex-col items-center mb-6 lg:mb-8 print:hidden">
          <img
            src="/logo.png"
            alt="Time & Material Calculator"
            className="h-12 sm:h-14 lg:h-16 w-auto object-contain"
          />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mt-3 text-center">
            Building Your Labor Rate Calculator
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[repeat(4,minmax(0,1fr))] gap-[5px] min-w-0 print:grid-cols-1">
          {/* Step 1: Paid Capacity */}
          <div className="lg:col-span-1 min-w-0 w-full print:hidden">
            <div 
              ref={step1Ref}
              className="bg-white rounded-lg shadow-lg pt-6 pr-4 pb-6 pl-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto scroll-smooth min-w-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
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
                    const isCustomHoursNotWorked = customHoursNotWorked.some(c => c.id === option.id)
                    return (
                      <div key={option.id} className="grid gap-1 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 grid-cols-[1fr_4.5rem_4rem]">
                        <div className="flex items-center gap-1.5 min-w-0 px-1">
                          <label className="text-gray-700 text-xs font-medium break-words line-clamp-2 leading-tight min-w-0">
                            {option.label}
                          </label>
                          {isCustomHoursNotWorked && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomHoursNotWorked(prev => prev.filter(c => c.id !== option.id))
                                setHoursNotWorked(prev => {
                                  const next = { ...prev }
                                  delete next[option.id]
                                  return next
                                })
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          )}
                        </div>
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
                    const isCustomNonBillable = customNonBillable.some(c => c.id === option.id)
                    return (
                      <div key={option.id} className={`grid gap-1 items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 grid-cols-[1fr_4.5rem_4rem] ${option.tooltip ? 'overflow-visible' : ''}`}>
                        <div className={`flex items-center gap-2 min-w-0 px-1 ${option.tooltip ? 'overflow-visible' : 'overflow-hidden'}`}>
                          <label className="text-gray-700 text-xs font-medium whitespace-pre-line break-words line-clamp-2 leading-tight min-w-0 overflow-hidden">
                            {option.label}
                          </label>
                          {isCustomNonBillable && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomNonBillable(prev => prev.filter(c => c.id !== option.id))
                                setNonBillableHours(prev => {
                                  const next = { ...prev }
                                  delete next[option.id]
                                  return next
                                })
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          )}
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
          <div className="lg:col-span-1 min-w-0 w-full min-w-[320px] print:hidden">
            <div 
              ref={step2Ref}
              className="bg-white rounded-lg shadow-lg pt-6 pr-5 pb-6 pl-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-auto overflow-y-auto scroll-smooth min-w-0 relative z-10"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
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
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right font-semibold no-spinner"
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
                
                {/* Table Header — aligns with input row only (labels sit above each row) */}
                <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 -ml-[10px] text-xs pl-[10px]">
                  <div className="text-left whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_PAYROLL_TAX_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="min-w-0 pl-[10px] pr-1 overflow-x-auto">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center min-w-0 pl-[10px]">
                        <div className="flex items-center justify-start min-w-0 px-0.5 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `payrollTax:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(mandatoryPayrollTaxPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `payrollTax:${option.id}`,
                              value: formatBrdnPercentForDisplay(mandatoryPayrollTaxPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `payrollTax:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `payrollTax:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = mandatoryPayrollTaxPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              if (draft === '' || Number.isNaN(v)) {
                                setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: '' }))
                              } else {
                                setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: Math.round(v * 100) / 100 }))
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'payrollTax', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: pct }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'payrollTax', rowId: option.id, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: pct }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        </div>
                      </div>
                    )
                  })}
                  {customPayrollTaxFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] ?? 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="flex items-start justify-between gap-2 min-w-0 pl-[10px] pr-1">
                          <div className="min-w-0 flex-1 overflow-x-auto">
                            <TruncatedLabelWithTooltip
                              label={field.label.replace(/\n/g, ' ')}
                              fullText={field.label.replace(/\n/g, ' ')}
                              labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomPayrollTaxFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center min-w-0 pl-[10px]">
                        <div className="flex items-center justify-start min-w-0 px-1 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `payrollTaxCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `payrollTaxCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `payrollTaxCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `payrollTaxCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              setCustomPayrollTaxFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'payrollTaxCustom', rowId: `custom-${idx}`, customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '' })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setCustomPayrollTaxFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'payrollTaxCustom', rowId: `custom-${idx}`, customIdx: idx, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setCustomPayrollTaxFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
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
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0 -ml-[10px]">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 pr-1 overflow-hidden ml-[10px] break-words" title="Payroll Tax Burden">Payroll Tax Burden</div>
                  <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center pl-[10px]">
                    <div className="text-left text-xs font-semibold text-primary px-0.5">
                      {safeCalculations.combinedFederalPayrollTaxPercent.toFixed(2)}%
                    </div>
                    <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                      ${safeCalculations.combinedFederalPayrollTaxHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                      ${annualSpendFromEarnedHourly(safeCalculations.combinedFederalPayrollTaxHourlyRate).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Worker Burden */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Mandatory Worker Burden
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 -ml-[10px] text-xs pl-[10px]">
                  <div className="text-left whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_WORKER_BURDEN_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="min-w-0 pl-[10px] pr-1 overflow-x-auto">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center min-w-0 pl-[10px]">
                        <div className="flex items-center justify-start min-w-0 px-0.5 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `workerBurden:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(mandatoryWorkerBurdenPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `workerBurden:${option.id}`,
                              value: formatBrdnPercentForDisplay(mandatoryWorkerBurdenPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `workerBurden:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `workerBurden:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = mandatoryWorkerBurdenPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              if (draft === '' || Number.isNaN(v)) {
                                setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: '' }))
                              } else {
                                setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: Math.round(v * 100) / 100 }))
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'workerBurden', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(v, workersWageNum) }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'workerBurden', rowId: option.id, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        </div>
                      </div>
                    )
                  })}
                  {customWorkerBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] ?? 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="flex items-start justify-between gap-2 min-w-0 pl-[10px] pr-1">
                          <div className="min-w-0 flex-1 overflow-x-auto">
                            <TruncatedLabelWithTooltip
                              label={field.label.replace(/\n/g, ' ')}
                              fullText={field.label.replace(/\n/g, ' ')}
                              labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomWorkerBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center min-w-0 pl-[10px]">
                        <div className="flex items-center justify-start min-w-0 px-1 pr-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `workerBurdenCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `workerBurdenCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `workerBurdenCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `workerBurdenCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              setCustomWorkerBurdenFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'workerBurdenCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  setCustomWorkerBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(v, workersWageNum) }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'workerBurdenCustom', customIdx: idx, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setCustomWorkerBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
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
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0 -ml-[10px]">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 pr-1 overflow-hidden ml-[10px] break-words" title="Worker Burden">Worker Burden</div>
                  <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center pl-[10px]">
                    <div className="text-left text-xs font-semibold text-primary px-0.5">
                      {safeCalculations.workerBurdenPercent.toFixed(2)}%
                    </div>
                    <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                      ${safeCalculations.workerBurdenHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                      ${annualSpendFromEarnedHourly(safeCalculations.workerBurdenHourlyRate).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Wage Burden */}
              <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/10 min-w-0 -ml-[10px]">
                <div className="text-gray-700 text-xs font-bold min-w-0 pr-1 overflow-hidden ml-[10px] break-words" title="Total Wage Burden">Total Wage Burden</div>
                <div className="grid grid-cols-[3.25rem_3.25rem_4.25rem] gap-1.5 items-center pl-[10px]">
                  <div className="text-left text-xs font-bold text-primary px-0.5">
                    {safeCalculations.totalMandatoryBurdenPercent.toFixed(2)}%
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                    ${safeCalculations.totalMandatoryBurdenHourlyRate.toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                    ${annualSpendFromEarnedHourly(safeCalculations.totalMandatoryBurdenHourlyRate).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Mandatory Burden */}
          <div className="lg:col-span-1 min-w-0 w-full min-w-[300px] print:hidden">
            <div 
              ref={step3MandatoryRef}
              className="bg-white rounded-lg shadow-lg pt-6 pr-5 pb-6 pl-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-auto overflow-y-auto scroll-smooth min-w-0 relative z-10"
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
                <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 text-xs">
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                  <div className="min-w-0" aria-hidden="true" />
                </div>
                
                <div className="space-y-1">
                  {BENEFITS_BURDEN_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="min-w-0 pr-1">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `benefits:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(benefitsBurdenPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `benefits:${option.id}`,
                              value: formatBrdnPercentForDisplay(benefitsBurdenPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `benefits:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `benefits:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = benefitsBurdenPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              if (draft === '' || Number.isNaN(v)) {
                                setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: '' }))
                              } else {
                                setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: Math.round(v * 100) / 100 }))
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'benefits', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(v, workersWageNum) }))
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'benefits', rowId: option.id, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div></div>
                        </div>
                      </div>
                    )
                  })}
                  {customBenefitsBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[`custom-${idx}`] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 pr-1">
                          <div className="min-w-0 flex-1">
                            <TruncatedLabelWithTooltip
                              label={field.label}
                              fullText={field.label}
                              labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomBenefitsBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `benefitsCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `benefitsCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `benefitsCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `benefitsCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              setCustomBenefitsBurdenFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'benefitsCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) setCustomBenefitsBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(v, workersWageNum) }; return u })
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'benefitsCustom', customIdx: idx, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setCustomBenefitsBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="min-w-0 w-8 shrink-0" aria-hidden="true" />
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
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden">Total Benefits Burden</div>
                  <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                    <div className="text-center text-xs font-semibold text-primary px-0.5">
                      {safeCalculations.benefitsBurdenPercent.toFixed(2)}%
                    </div>
                    <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                      ${safeCalculations.benefitsBurdenHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                      ${annualSpendFromEarnedHourly(safeCalculations.benefitsBurdenHourlyRate).toFixed(2)}
                    </div>
                    <div className="min-w-0" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Additional Overheads */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Additional Overheads
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 text-xs">
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                  <div className="min-w-0" aria-hidden="true" />
                </div>
                
                <div className="space-y-1">
                  {ADDITIONAL_OVERHEADS_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="min-w-0 pr-1">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `additionalOverheads:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(additionalOverheadsPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `additionalOverheads:${option.id}`,
                              value: formatBrdnPercentForDisplay(additionalOverheadsPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `additionalOverheads:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `additionalOverheads:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = additionalOverheadsPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              if (draft === '' || Number.isNaN(v)) {
                                setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: '' }))
                              } else {
                                setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: Math.round(v * 100) / 100 }))
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheads', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(v, workersWageNum) }))
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheads', rowId: option.id, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div></div>
                        </div>
                      </div>
                    )
                  })}
                  {customAdditionalOverheadsFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[`custom-${idx}`] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 pr-1">
                          <div className="min-w-0 flex-1">
                            <TruncatedLabelWithTooltip
                              label={field.label}
                              fullText={field.label}
                              labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomAdditionalOverheadsFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `additionalOverheadsCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `additionalOverheadsCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `additionalOverheadsCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `additionalOverheadsCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              setCustomAdditionalOverheadsFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheadsCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) setCustomAdditionalOverheadsFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(v, workersWageNum) }; return u })
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheadsCustom', customIdx: idx, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setCustomAdditionalOverheadsFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="min-w-0 w-8 shrink-0" aria-hidden="true" />
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
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden break-words" title="Total Additional Overheads">Total Additional Overheads</div>
                  <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                    <div className="text-center text-xs font-semibold text-primary px-0.5">
                      {safeCalculations.additionalOverheadsPercent.toFixed(2)}%
                    </div>
                    <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                      ${safeCalculations.additionalOverheadsHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                      ${annualSpendFromEarnedHourly(safeCalculations.additionalOverheadsHourlyRate).toFixed(2)}
                    </div>
                    <div className="min-w-0" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Employee Costs */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Employee Costs
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 mb-2 font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0 text-xs">
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                  <div className="min-w-0" aria-hidden="true" />
                </div>
                
                <div className="space-y-1">
                  {EMPLOYEE_COSTS_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="min-w-0 pr-1">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `employeeCosts:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(employeeCostsPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `employeeCosts:${option.id}`,
                              value: formatBrdnPercentForDisplay(employeeCostsPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `employeeCosts:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `employeeCosts:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = employeeCostsPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              if (draft === '' || Number.isNaN(v)) {
                                setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: '' }))
                              } else {
                                setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: Math.round(v * 100) / 100 }))
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'employeeCosts', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(v, workersWageNum) }))
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'employeeCosts', rowId: option.id, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }))
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div></div>
                        </div>
                      </div>
                    )
                  })}
                  {customEmployeeCosts.map((cost, idx) => {
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={cost.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 pr-1">
                          <div className="min-w-0 flex-1">
                            <TruncatedLabelWithTooltip
                              label={cost.label}
                              fullText={cost.label}
                              labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomEmployeeCosts(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `employeeCostsCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(cost.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `employeeCostsCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(cost.percent)
                            })}
                            onChange={(e) => {
                              const k = `employeeCostsCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `employeeCostsCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = cost.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              setCustomEmployeeCosts(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'employeeCostsCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) setCustomEmployeeCosts(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(v, workersWageNum) }; return u })
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : (annualSpend > 0 ? annualSpend.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'employeeCostsCustom', customIdx: idx, field: 'chgd', value: annualSpend > 0 ? annualSpend.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  setCustomEmployeeCosts(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: burdenPercentFromEarnedHourly(earnedHrly, workersWageNum) }; return u })
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="min-w-0 w-8 shrink-0" aria-hidden="true" />
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
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden break-words" title="Total Employee Costs">Total Employee Costs</div>
                  <div className="grid grid-cols-[3rem_3rem_3.75rem_1.5rem] gap-1.5 items-center min-w-0">
                    <div className="text-center text-xs font-semibold text-primary px-0.5">
                      {safeCalculations.employeeCostsPercent.toFixed(2)}%
                    </div>
                    <div className="text-center text-xs font-bold text-gray-700 px-0.5">
                      ${safeCalculations.employeeCostsHourlyRate.toFixed(2)}
                    </div>
                    <div className="text-center text-xs font-bold text-primary pl-0.5 pr-2">
                      ${annualSpendFromEarnedHourly(safeCalculations.employeeCostsHourlyRate).toFixed(2)}
                    </div>
                    <div className="min-w-0" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Division Overhead */}
              <div className="mb-6 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Division Overhead
                </h3>
                
                {/* Table Header */}
                <div className="grid grid-cols-[3rem_3rem_3.75rem] gap-1.5 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0">
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <div className="flex items-start gap-2 min-w-0 pr-1">
                      <label className="text-gray-700 text-xs font-medium break-words min-w-0 leading-snug">
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
                    <div className="grid grid-cols-[3rem_3rem_3.75rem] gap-1.5 items-center min-w-0">
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'divisionOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(divisionOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'divisionOverhead',
                          value: formatBrdnPercentForDisplay(divisionOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'divisionOverhead') setEditingBrdnField({ key: 'divisionOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'divisionOverhead') return
                          const before = formatBrdnPercentForDisplay(divisionOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) setDivisionOverheadPercent('')
                          else setDivisionOverheadPercent(Math.round(v * 100) / 100)
                          setEditingBrdnField(null)
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'hrly' ? editingDollarField.value : (safeCalculations.divisionOverheadCharged > 0 ? safeCalculations.divisionOverheadHourlyRate.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'divisionOverhead', field: 'hrly', value: safeCalculations.divisionOverheadCharged > 0 ? safeCalculations.divisionOverheadHourlyRate.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'hrly') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.costBaseBeforeOverheadAndProfit || 0
                            if (!Number.isNaN(v) && v >= 0 && base + v > 0) setDivisionOverheadPercent(100 * v / (base + v))
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'chgd' ? editingDollarField.value : (safeCalculations.divisionOverheadCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.divisionOverheadCharged).toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'divisionOverhead', field: 'chgd', value: safeCalculations.divisionOverheadCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.divisionOverheadCharged).toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'chgd') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.costBaseBeforeOverheadAndProfit || 0
                            const hourly = v / PAID_CAPACITY
                            if (!Number.isNaN(v) && v >= 0 && base + hourly > 0) setDivisionOverheadPercent(100 * hourly / (base + hourly))
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                    </div>
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
                <div className="grid grid-cols-[3rem_3rem_3.75rem] gap-1.5 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0">
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <label className="text-gray-700 text-xs font-medium break-words min-w-0 pr-1 leading-snug">
                      General Company Overhead
                    </label>
                    <div className="grid grid-cols-[3rem_3rem_3.75rem] gap-1.5 items-center min-w-0">
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'generalOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(generalCompanyOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'generalOverhead',
                          value: formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'generalOverhead') setEditingBrdnField({ key: 'generalOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'generalOverhead') return
                          const before = formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) setGeneralCompanyOverheadPercent('')
                          else setGeneralCompanyOverheadPercent(Math.round(v * 100) / 100)
                          setEditingBrdnField(null)
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'hrly' ? editingDollarField.value : (safeCalculations.generalCompanyOverheadCharged > 0 ? safeCalculations.generalCompanyOverheadHourlyRate.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'generalOverhead', field: 'hrly', value: safeCalculations.generalCompanyOverheadCharged > 0 ? safeCalculations.generalCompanyOverheadHourlyRate.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'hrly') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterDivisionOverhead || 0
                            if (!Number.isNaN(v) && v >= 0 && base + v > 0) setGeneralCompanyOverheadPercent(100 * v / (base + v))
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'chgd' ? editingDollarField.value : (safeCalculations.generalCompanyOverheadCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.generalCompanyOverheadCharged).toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'generalOverhead', field: 'chgd', value: safeCalculations.generalCompanyOverheadCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.generalCompanyOverheadCharged).toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'chgd') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterDivisionOverhead || 0
                            const hourly = v / PAID_CAPACITY
                            if (!Number.isNaN(v) && v >= 0 && base + hourly > 0) setGeneralCompanyOverheadPercent(100 * hourly / (base + hourly))
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                    </div>
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
                <div className="grid grid-cols-[3rem_3rem_3.75rem] gap-1.5 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1 min-w-0">
                  <div className="text-center whitespace-nowrap px-0.5">Brdn (%)</div>
                  <div className="text-center whitespace-nowrap px-0.5">Hrly ($)</div>
                  <div className="text-center whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <label className="text-gray-700 text-xs font-medium break-words min-w-0 pr-1 leading-snug">
                      Profit
                    </label>
                    <div className="grid grid-cols-[3rem_3rem_3.75rem] gap-1.5 items-center min-w-0">
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'profit' ? editingBrdnField.value : formatBrdnPercentForDisplay(profitPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'profit',
                          value: formatBrdnPercentForDisplay(profitPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'profit') setEditingBrdnField({ key: 'profit', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'profit') return
                          const before = formatBrdnPercentForDisplay(profitPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) setProfitPercent('')
                          else setProfitPercent(Math.round(v * 100) / 100)
                          setEditingBrdnField(null)
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'profit' && editingDollarField?.field === 'hrly' ? editingDollarField.value : (safeCalculations.profitCharged > 0 ? safeCalculations.profitHourlyRate.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'profit', field: 'hrly', value: safeCalculations.profitCharged > 0 ? safeCalculations.profitHourlyRate.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'hrly') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterGeneralOverhead || 0
                            if (!Number.isNaN(v) && v >= 0 && base + v > 0) setProfitPercent(100 * v / (base + v))
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center justify-center min-w-0 overflow-visible pl-0.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'profit' && editingDollarField?.field === 'chgd' ? editingDollarField.value : (safeCalculations.profitCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.profitCharged).toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'profit', field: 'chgd', value: safeCalculations.profitCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.profitCharged).toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'chgd') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterGeneralOverhead || 0
                            const hourly = v / PAID_CAPACITY
                            if (!Number.isNaN(v) && v >= 0 && base + hourly > 0) setProfitPercent(100 * hourly / (base + hourly))
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Results - Burden / Hour Charged */}
          <div className="lg:col-span-1 min-w-0 w-full print:w-full">
            <div 
              ref={step3Ref}
              className="step-4-print-root bg-white rounded-lg shadow-lg p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto scroll-smooth min-w-0 print:static print:top-auto print:max-h-none print:overflow-visible print:shadow-none print:p-2"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2 print:text-sm print:mb-2 print:pb-1 print:border-b">
                Step 4: Results - Burden / Hour Charged
              </h2>

              {/* Key Calculation Display */}
              <div className="mb-3 p-3 bg-primary/10 rounded-lg border-2 border-primary print:mb-1.5 print:p-2 print:border">
                <div className="space-y-1.5 print:space-y-1">
                  <div>
                    <div className="text-xs text-gray-600 print:text-[10px]">Workers Wage (Earned)</div>
                    <div className="text-lg font-bold text-primary print:text-base">${(parseFloat(workersWage) || 0).toFixed(2)}/hr</div>
                  </div>
                  <div className="border-t border-primary/20 pt-1.5 print:pt-1">
                    <div className="text-xs text-gray-600 print:text-[10px]">Workers Wage (Charged)</div>
                    <div className="text-lg font-bold text-primary print:text-base">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                      <div className="text-xs text-gray-500 mt-1 whitespace-nowrap print:text-[10px] print:mt-0.5">
                        = ${(parseFloat(workersWage) || 0).toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 print:p-2 print:mb-2 print:rounded-md">
                <h3 className="text-sm font-semibold text-neutral mb-2 print:text-xs print:mb-1 print:leading-tight">
                  Detailed Breakdown
                </h3>
                
                <div className="space-y-3 text-sm print:space-y-1 print:text-[11px] print:leading-snug">
                  {/* Paid Capacity summary */}
                  <div className="border-b border-gray-200 pb-2 print:pb-0.5">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-700 min-w-0 truncate">Paid Capacity</span>
                      <span className="font-bold text-primary shrink-0">
                        {(safeCalculations.utilizationPercent * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Workers Wage */}
                  <div className="border-b border-gray-200 pb-2 print:pb-0.5">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-700 min-w-0 truncate">Workers Wage</span>
                      <span className="font-bold text-primary shrink-0">${safeCalculations.workersWageCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Mandatory Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Mandatory Burden</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
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
                      <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t border-gray-200 mt-1 gap-2 min-w-0 print:pt-0.5 print:mt-0.5">
                        <span className="text-xs min-w-0">Total:</span>
                        <span className="text-primary text-xs shrink-0">${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Benefits Burden</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
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
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Additional Overheads</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
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
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Employee Costs</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
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
                  <div className="border-t border-gray-200 pt-2 print:pt-1">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">Division Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({parseFloat(divisionOverheadPercent) || 0}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.divisionOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* General Company Overhead */}
                  <div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">General Company Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({parseFloat(generalCompanyOverheadPercent) || 0}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Profit */}
                  <div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">Profit</span>
                        <span className="text-xs text-gray-500 ml-1">({parseFloat(profitPercent) || 0}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.profitCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Labor Rate */}
              <div className="bg-primary/10 rounded-lg p-4 mb-4 border-2 border-primary print:p-2 print:mb-0 print:rounded-md">
                <h3 className="text-base font-semibold text-primary mb-2 print:text-sm print:mb-1">
                  Total Labor Rate
                </h3>
                <div className="text-3xl font-bold text-primary print:text-2xl print:leading-tight">
                  ${safeCalculations.totalLaborRate.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-600 mt-1 print:text-[10px] print:mt-0.5">
                  Rate to charge for this employee's time
                </div>
              </div>

              {/* Step 3 Inputs — hidden when printing (values appear in breakdown above) */}
              <div className="bg-gray-50 rounded-lg p-4 print:hidden">
                <h3 className="text-sm font-semibold text-neutral mb-3">
                  Adjust Overhead & Profit
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 text-sm font-medium pr-3">Division Overhead:</label>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'divisionOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(divisionOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'divisionOverhead',
                          value: formatBrdnPercentForDisplay(divisionOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'divisionOverhead') setEditingBrdnField({ key: 'divisionOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'divisionOverhead') return
                          const before = formatBrdnPercentForDisplay(divisionOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) setDivisionOverheadPercent('')
                          else setDivisionOverheadPercent(Math.round(v * 100) / 100)
                          setEditingBrdnField(null)
                        }}
                        className="w-[68px] px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 text-sm font-medium pr-3">General Company Overhead:</label>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'generalOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(generalCompanyOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'generalOverhead',
                          value: formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'generalOverhead') setEditingBrdnField({ key: 'generalOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'generalOverhead') return
                          const before = formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) setGeneralCompanyOverheadPercent('')
                          else setGeneralCompanyOverheadPercent(Math.round(v * 100) / 100)
                          setEditingBrdnField(null)
                        }}
                        className="w-[68px] px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 text-sm font-medium pr-3">Profit:</label>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'profit' ? editingBrdnField.value : formatBrdnPercentForDisplay(profitPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'profit',
                          value: formatBrdnPercentForDisplay(profitPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'profit') setEditingBrdnField({ key: 'profit', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'profit') return
                          const before = formatBrdnPercentForDisplay(profitPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) setProfitPercent('')
                          else setProfitPercent(Math.round(v * 100) / 100)
                          setEditingBrdnField(null)
                        }}
                        className="w-[68px] px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Print Button */}
              <div className="mt-4 print:hidden">
                <button
                  type="button"
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
