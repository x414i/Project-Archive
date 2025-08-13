import React from 'react';

const YearSeasonFields = ({
  formData,
  errors,
  isSubmitting,
  handleChange,
  years
}) => {
  return (
    <>
      <div className={`form-group ${errors.year ? "error-label" : ""}`}>
        <span>السنة</span>
        <select
          name="year"
          value={formData.year}
          onChange={handleChange}
          className={errors.year ? "error-input" : ""}
          disabled={isSubmitting}
        >
          <option value="">اختر سنة</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        {errors.year && <div className="error-message">{errors.year}</div>}
      </div>

      <div className={`form-group ${errors.season ? "error-label" : ""}`}>
        <span>الفصل</span>
        <select
          name="season"
          value={formData.season}
          onChange={handleChange}
          className={errors.season ? "error-input" : ""}
          disabled={isSubmitting}
        >
          <option value="">اختر فصل</option>
          <option value="spring">ربيع</option>
          <option value="fall">خريف</option>
        </select>
        {errors.season && <div className="error-message">{errors.season}</div>}
      </div>
    </>
  );
};

export default YearSeasonFields;