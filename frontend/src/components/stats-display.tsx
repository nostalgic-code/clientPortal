'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface StatProps {
  value: number
  label: string
  suffix?: string
  delay?: number
}

function AnimatedStat({ value, label, suffix = '', delay = 0 }: StatProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = value / steps
    const stepDuration = duration / steps

    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-bold mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-muted-foreground">{label}</div>
    </motion.div>
  )
}

export default function StatsDisplay() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
      <AnimatedStat value={500} suffix="+" label="Active Projects" delay={0.1} />
      <AnimatedStat value={1200} suffix="+" label="Happy Clients" delay={0.2} />
      <AnimatedStat value={99} suffix="%" label="Satisfaction Rate" delay={0.3} />
      <AnimatedStat value={24} suffix="/7" label="Support Available" delay={0.4} />
    </div>
  )
}
