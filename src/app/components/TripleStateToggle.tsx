import React from 'react'
import { SystemPromptMode } from '~services/user-config'

interface TripleStateToggleProps {
  value: SystemPromptMode
  onChange: (value: SystemPromptMode) => void
  className?: string
}

const TripleStateToggle: React.FC<TripleStateToggleProps> = ({ value, onChange, className = '' }) => {
  const labels = {
    [SystemPromptMode.COMMON]: {
      title: 'Common',
      desc: 'Use common system prompt'
    },
    [SystemPromptMode.APPEND]: {
      title: 'Append',
      desc: 'Common + custom prompt'
    },
    [SystemPromptMode.OVERRIDE]: {
      title: 'Override',
      desc: 'Use only custom prompt'
    }
  }

  const positions = [SystemPromptMode.COMMON, SystemPromptMode.APPEND, SystemPromptMode.OVERRIDE]
  const currentIndex = positions.indexOf(value)

  const getAnimationClass = (targetValue: SystemPromptMode) => {
    const targetIndex = positions.indexOf(targetValue)
    const current = currentIndex

    if (targetIndex === current) return ''
    
    if (current === 0 && targetIndex === 1) return 'left-to-center'
    if (current === 0 && targetIndex === 2) return 'left-to-right'
    if (current === 1 && targetIndex === 0) return 'center-to-left'
    if (current === 1 && targetIndex === 2) return 'center-to-right'
    if (current === 2 && targetIndex === 0) return 'right-to-left'
    if (current === 2 && targetIndex === 1) return 'right-to-center'
    
    return ''
  }

  const getPositionClass = () => {
    switch (currentIndex) {
      case 0: return 'left-position'
      case 1: return 'center-position'
      case 2: return 'right-position'
      default: return 'left-position'
    }
  }

  return (
    <div className={`triple-toggle-container ${className}`}>
      <style>{`
        .triple-toggle-container {
          display: inline-block;
          vertical-align: middle;
          width: 210px;
          height: 36px;
          border-radius: 18px;
          background-color: #e5e7eb;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dark .triple-toggle-container {
          background-color: #374151;
        }

        .toggle-switch {
          height: 28px;
          width: 66px;
          background-color: white;
          border-radius: 14px;
          position: absolute;
          top: 4px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .dark .toggle-switch {
          background-color: #1f2937;
        }

        .toggle-switch.left-position {
          left: 4px;
        }

        .toggle-switch.center-position {
          left: 72px;
        }

        .toggle-switch.right-position {
          left: 140px;
        }

        .toggle-label {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          width: 66px;
          border-radius: 18px;
          cursor: pointer;
          z-index: 10;
          color: #6b7280;
          font-size: 11px;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .toggle-label:hover {
          color: #374151;
        }

        .dark .toggle-label {
          color: #9ca3af;
        }

        .dark .toggle-label:hover {
          color: #d1d5db;
        }

        .toggle-label.active {
          color: #1f2937 !important;
          font-weight: 600;
        }

        .dark .toggle-label.active {
          color: #f9fafb !important;
        }

        .label-left {
          left: 4px;
        }

        .label-center {
          left: 72px;
        }

        .label-right {
          left: 140px;
        }

        .toggle-input {
          display: none;
        }
      `}</style>
      
      <div className={`toggle-switch ${getPositionClass()}`}></div>
      
      {positions.map((mode, index) => (
        <label
          key={mode}
          className={`toggle-label ${
            index === 0 ? 'label-left' : 
            index === 1 ? 'label-center' : 
            'label-right'
          } ${value === mode ? 'active' : ''}`}
          title={labels[mode].desc}
        >
          <input
            type="radio"
            name="system-prompt-mode"
            value={mode}
            checked={value === mode}
            onChange={() => onChange(mode)}
            className="toggle-input"
          />
          {labels[mode].title}
        </label>
      ))}
    </div>
  )
}

export default TripleStateToggle