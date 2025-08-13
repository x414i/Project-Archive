import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const AnimatedStat = ({ targetValue }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true }); 
  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2500; 
      const increment = targetValue / (duration / 10);

      const timer = setInterval(() => {
        start += increment;
        if (start >= targetValue) {
          setCount(Math.round(targetValue));
          clearInterval(timer);
        } else {
          setCount(Math.round(start));
        }
      }, 10);

      return () => clearInterval(timer);
    } else {
      setCount(0);
    }
  }, [targetValue, isInView]);

  return (
    <motion.span
      ref={ref}

      animate={{ 
        
        opacity: isInView ? [0, 1] : 0, 
        y: isInView ? [10, 0] : 10 
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {count}
    </motion.span>
  );
};

export default AnimatedStat;