import React from 'react';
import { Link } from 'react-router-dom';

const SimilarProjectsDialog = ({
  similarProjects,
  isSubmitting,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="confirmation-dialog">
      <h3>تم العثور على مشاريع مشابهة</h3>
      <div className="similar-projects-list">
        {similarProjects.length > 0 ? (
          similarProjects.map((project) => {
            // Determine if it's a pre-project based on source_table
            const isPreProject = project.source_table === 'pre_project';

            return (
              <div key={project.project_id} className="similar-project-item">
                <div style={{ flex: 1 }}>
                  <div className="similar-project-item-title">
                    {project.project_name}
                  </div>
                  <p className="similar-project-item-description">
                    {project.project_description}
                  </p>
                  <div className="similar-project-item-similarity">
                    نسبة التشابه: {project.similarity_score}%
                  </div>
                  <div className="similar-project-item-type">
                    نوع المشروع: {isPreProject ? "مشروع أولي" : "مشروع نهائي"}
                  </div>
                </div>
                <Link 
                  to={isPreProject 
                    ? `/PreProjects/${project.project_id}` 
                    : `/projects/${project.project_id}`
                  } 
                  className="link-button"
                >
                  عرض التفاصيل
                </Link>
              </div>
            );
          })
        ) : (
          <div>لا توجد تفاصيل للمشاريع المشابهة</div>
        )}
      </div>
      <div className="confirmation-actions">
        <button 
          onClick={onConfirm} 
          disabled={isSubmitting}
          className="confirm-button"
        >
          {isSubmitting ? "جاري الإضافة..." : "التأكيد على أي حال"}
        </button>
        <button 
          onClick={onCancel} 
          disabled={isSubmitting}
          className="cancel-button"
        >
          تعديل المشروع
        </button>
      </div>
    </div>
  );
};

export default SimilarProjectsDialog;