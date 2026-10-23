import { motion } from 'motion/react'

// Fades content up once as it enters the viewport. MotionConfig in App
// switches this off for visitors who prefer reduced motion.
export default function Reveal({ as = 'div', delay = 0, y = 18, children, ...rest }) {
  const Tag = motion[as]
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
