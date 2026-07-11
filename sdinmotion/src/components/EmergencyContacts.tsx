import React from 'react'
import { PhoneIcon } from './icons'

interface EmergencyContact {
  name: string
  number: string
  category: string
  icon: string
  available: string
}

const CONTACTS: EmergencyContact[] = [
  { name: 'Water & Sanitation Emergency', number: '018 299 5111', category: 'Water', icon: '🚰', available: '24/7' },
  { name: 'Electricity Emergency', number: '018 299 5222', category: 'Electricity', icon: '⚡', available: '24/7' },
  { name: 'Fire & Rescue', number: '018 299 5333', category: 'Fire', icon: '🚒', available: '24/7' },
  { name: 'Municipal Call Centre', number: '018 299 5000', category: 'General', icon: '📞', available: 'Mon-Fri 7:30-16:30' },
  { name: 'After Hours Emergency', number: '018 299 5444', category: 'After Hours', icon: '🌙', available: 'After 16:30 & Weekends' },
  { name: 'Illegal Dumping Hotline', number: '018 299 5555', category: 'Waste', icon: '🗑️', available: 'Mon-Fri 7:30-16:30' },
  { name: 'Roads & Stormwater', number: '018 299 5666', category: 'Roads', icon: '🛣️', available: 'Mon-Fri 7:30-16:30' },
  { name: 'Police (SAPS)', number: '10111', category: 'Emergency', icon: '🚔', available: '24/7' },
  { name: 'Ambulance', number: '10177', category: 'Emergency', icon: '🚑', available: '24/7' },
]

export const EmergencyContacts: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="text-white px-4 py-6 shadow-lg" style={{ backgroundColor: '#DC2626' }}>
        <h1 className="text-2xl font-bold text-center">🚨 Emergency Contacts</h1>
        <p className="text-center text-white opacity-90 text-sm mt-2">
          Tap to call • Available 24/7 for emergencies
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {/* Critical emergency numbers */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-red-800 mb-3">⚠️ LIFE-THREATENING EMERGENCIES</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="tel:10111" className="flex items-center gap-2 bg-white rounded-lg p-3 border border-red-200 shadow-sm">
              <span className="text-xl">🚔</span>
              <div>
                <p className="text-xs font-bold text-gray-800">Police</p>
                <p className="text-sm font-bold text-red-700">10111</p>
              </div>
            </a>
            <a href="tel:10177" className="flex items-center gap-2 bg-white rounded-lg p-3 border border-red-200 shadow-sm">
              <span className="text-xl">🚑</span>
              <div>
                <p className="text-xs font-bold text-gray-800">Ambulance</p>
                <p className="text-sm font-bold text-red-700">10177</p>
              </div>
            </a>
          </div>
        </div>

        {/* Municipal contacts */}
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Municipal Services</h3>
        {CONTACTS.filter(c => c.category !== 'Emergency').map((contact, i) => (
          <a
            key={i}
            href={`tel:${contact.number.replace(/\s/g, '')}`}
            className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-xl flex-shrink-0">
              {contact.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{contact.name}</p>
              <p className="text-xs text-gray-500">{contact.available}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-700">{contact.number}</span>
              <PhoneIcon className="h-5 w-5 text-green-600" />
            </div>
          </a>
        ))}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-800">
            💡 <strong>Tip:</strong> For non-emergency issues, please use the <strong>Report</strong> feature to log a fault. This ensures your issue is tracked and resolved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmergencyContacts
