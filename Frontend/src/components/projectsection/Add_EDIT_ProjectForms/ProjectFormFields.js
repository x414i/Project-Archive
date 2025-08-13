import React from 'react';
import TeacherSelectionFields from './TeacherSelectionFields.js'
import YearSeasonFields from './YearSeasonFields.js'
import StudentSelectionFields from './StudentSelectionFields';

const ProjectFormFields = ({ 
  formData, 
  errors, 
  isSubmitting, 
  handleChange, 
  handleFileChange,
  handleDynamicFieldChange,
  addDynamicField,
  removeDynamicField,
  teachers,
  students,
  years
}) => {
  return (
    <div className="form-grid">
      <div className="form-column">
        {/* Project Name */}
        <div className={`form-group ${errors.name ? "error-label" : ""}`}>
          <span>اسم المشروع</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? "error-input" : ""}
            disabled={isSubmitting}
          />
          {errors.name && <div className="error-message">{errors.name}</div>}
        </div>

        {/* Project Description */}
        <div className={`form-group ${errors.description ? "error-label" : ""}`}>
          <span>وصف المشروع</span>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={errors.description ? "error-input" : ""}
            disabled={isSubmitting}
          />
          {errors.description && <div className="error-message">{errors.description}</div>}
        </div>

        {/* Students */}
        <div className={`form-group ${errors.students ? "error-label" : ""}`}>
        <StudentSelectionFields
        formData={formData}
        errors={errors}
        isSubmitting={isSubmitting}
        students={students}
        handleDynamicFieldChange={handleDynamicFieldChange}
        addDynamicField={addDynamicField}
        removeDynamicField={removeDynamicField}
      />
      </div>
      </div>

      <div className="form-column">
   

        {/* Teachers Selection Fields */}
        <TeacherSelectionFields
          formData={formData}
          errors={errors}
          isSubmitting={isSubmitting}
          teachers={teachers}
          handleDynamicFieldChange={handleDynamicFieldChange}
          addDynamicField={addDynamicField}
          removeDynamicField={removeDynamicField}
        />

        {/* Year and Season */}
        <div className="form-row">
          <YearSeasonFields
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            handleChange={handleChange}
            years={years}
          />
        </div>

        {/* File Upload */}
        <div className="form-group">
  <label>
    ملف (اختياري)
    <div className="file-upload">
      <span>{formData.file ? formData.file.name : "اختر ملف"}</span>
      <input type="file" name="file" onChange={handleFileChange} />
    </div>
    {errors.file && <div className="error-message">{errors.file}</div>} {/* Display error message */}
  </label>
        </div>
      </div>
    </div>
  );
};

export default ProjectFormFields;