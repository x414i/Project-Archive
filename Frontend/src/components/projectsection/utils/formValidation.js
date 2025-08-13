export const validateProjectForm = (formData) => {
    const errors = {};
  
    // Name validation
    if (!formData.name) {
      errors.name = "اسم المشروع مطلوب";
    } else if (formData.name.length < 3) {
      errors.name = "يجب أن يكون اسم المشروع على الأقل 3 أحرف";
    } else if (formData.name.length > 150) {
      errors.name = "يجب أن يكون اسم المشروع أقل من 150 حرف";
    }
  
    // Description validation
    if (!formData.description) {
      errors.description = "وصف المشروع مطلوب";
    } else if (formData.description.length < 10) {
      errors.description = "يجب أن يكون وصف المشروع على الأقل 10 أحرف";
    } else if (formData.description.length > 1000) {
      errors.description = "لا يمكن لوصف المشروع أن يكون أكثر من 1000 حرف";
    }
  
    // Students validation
    if (formData.students.length === 0 || formData.students.every((student) => !student)) {
      errors.students = "يجب إضافة طالب واحد على الأقل";
    } else if (formData.students.length > 5) {
      errors.students = "لا يمكن إضافة أكثر من 5 طلاب";
    }
  
    // Advisors validation
    if (formData.advisors.length === 0 || formData.advisors.every((advisor) => !advisor)) {
      errors.advisors = "يجب إضافة مشرف واحد على الأقل";
    } else if (formData.advisors.length > 3) {
      errors.advisors = "لا يمكن إضافة أكثر من 3 مشرفين";
    }
  
    // Discussants validation
    if (formData.discutants.length === 0 || formData.discutants.every((discutant) => !discutant)) {
      errors.discutants = "يجب إضافة مناقش واحد على الأقل";
    } else if (formData.discutants.length > 3) {
      errors.discutants = "لا يمكن إضافة أكثر من 3 مناقشين";
    }
  
    // Year validation
    if (!formData.year) {
      errors.year = "السنة مطلوبة";
    }
  
    // Season validation
    if (!formData.season) {
      errors.season = "الفصل مطلوب";
    } else if (!["spring", "fall"].includes(formData.season)) {
      errors.season = "يجب اختيار موسم ربيع أو خريف";
    }
  
    return errors;
  };