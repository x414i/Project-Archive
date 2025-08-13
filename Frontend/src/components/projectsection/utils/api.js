const API_BASE_URL = 'http://localhost:8080';

export const submitProjectForm = async (formData, projectId = null, confirm = false) => {
  const data = new FormData();
  data.append("name", formData.name);
  data.append("description", formData.description);
  data.append("students", formData.students.join(","));
  data.append("advisors", formData.advisors.join(","));
  data.append("discutants", formData.discutants.join(","));
  data.append("year", formData.year);
  data.append("season", formData.season);
  
  if (formData.file) {
    data.append("file", formData.file);
  }

  if (confirm) {
    data.append("confirm", "true");
  }

  const url = projectId 
    ? `${API_BASE_URL}/book/${projectId}`
    : `${API_BASE_URL}/book`;

  const response = await fetch(url, {
    method: projectId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: data,
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw responseData;
  }

  return responseData;
};

export const fetchTeachers = async () => {
  const response = await fetch(`${API_BASE_URL}/teachers`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch teachers");
  }

  const data = await response.json();
  return data.teachers;
};

export const fetchStudents = async () => {
  const response = await fetch(`${API_BASE_URL}/graduationstudents?role_ids=5`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch students");
  }

  const data = await response.json();
  return data.students;
};