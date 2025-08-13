export const fetchConversations = async (token) => {
  const response = await fetch("http://localhost:8080/conversations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("لا يمكن الاطلاع على المحادثات!");
    }
    throw new Error("Failed to load conversations");
  }
  
  const data = await response.json();
  return data.conversations || [];
};


export const fetchMessages = async (conversationId, token, page = 1) => {
  const response = await fetch(
    `http://localhost:8080/conversation/${conversationId}?page=${page}&per_page=10&sort=-created_at`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to load messages");
  const data = await response.json();
  return {
    messages: data.chats || [],
    meta: data.meta
  };
};

export const deleteMessage = async (messageId, token) => {
  const response = await fetch(`http://localhost:8080/chats/${messageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("Failed to delete message");
};

export const deleteConversation = async (conversationId, token) => {
  const response = await fetch(`http://localhost:8080/conversation/${conversationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to delete conversation");
  }
};