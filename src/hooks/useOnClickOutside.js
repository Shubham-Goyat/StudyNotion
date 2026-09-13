import { useEffect } from "react";

// This hook detects clicks outside of the specified component and calls the provided handler function.
export default function useOnClickOutside(ref, handler) {
  useEffect(() => {
    // Define the listener function to be called on click/touch events
    const listener = (event) => {
      // If the click/touch event originated inside the ref element, do nothing

      /* ref.current null nhi h mtlb usme div object aya h dropdown wala mtlb abhi handler call nhi krna
      Jab hum dropdown ke ANDAR click karte hain:
    → ref.current.contains(event.target) = TRUE
    → Return kar dete hain (kuch nahi karte)
    → Dropdown khula rahta hai ✅

    Jab hum dropdown ke BAHAR click karte hain:
    → ref.current.contains(event.target) = FALSE
    → Handler function call hota hai
    → setOpen(false) → Dropdown band ho jata hai ❌
      */
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      // Otherwise, call the provided handler function
      handler(event);
    };

    // Add event listeners for mousedown and touchstart events on the document
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    // Cleanup function to remove the event listeners when the component unmounts or when the ref/handler dependencies change
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]); // Only run this effect when the ref or handler function changes
}
