import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useSelector } from "react-redux";

export default function ChipInput({
  label,
  name,
  placeholder,
  register,
  errors,
  setValue,
  getValues,
}) {
  const { editCourse, course } = useSelector((state) => state.course);

  // Always guard against undefined/null tag arrays
  const [chips, setChips] = useState(() =>
    editCourse && Array.isArray(course?.tag) ? course.tag : [],
  );
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    register(name, { required: true, validate: (value) => value?.length > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setValue(name, chips, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const chipValue = inputValue.trim();
      if (!chipValue) return;

      setChips((prevChips) => {
        const safePrev = Array.isArray(prevChips) ? prevChips : [];
        if (safePrev.includes(chipValue)) return safePrev;
        return [...safePrev, chipValue];
      });
      setInputValue("");
    }
  };

  const handleDeleteChip = (chipIndex) => {
    setChips((prevChips) =>
      prevChips.filter((_, index) => index !== chipIndex),
    );
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5" htmlFor={name}>
        {label} <sup className="text-pink-200">*</sup>
      </label>

      <div className="flex w-full flex-wrap gap-y-2">
        {Array.isArray(chips) &&
          chips.map((chip, index) => (
            <div
              key={`${chip}-${index}`}
              className="m-1 flex items-center rounded-full bg-yellow-400 px-2 py-1 text-sm text-richblack-5"
            >
              {chip}
              <button
                type="button"
                className="ml-2 focus:outline-none"
                onClick={() => handleDeleteChip(index)}
              >
                <MdClose className="text-sm" />
              </button>
            </div>
          ))}

        <input
          id={name}
          name={name}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="form-style w-full"
        />
      </div>

      {errors[name] && (
        <span className="ml-2 text-xs tracking-wide text-pink-200">
          {label} is required
        </span>
      )}
    </div>
  );
}
