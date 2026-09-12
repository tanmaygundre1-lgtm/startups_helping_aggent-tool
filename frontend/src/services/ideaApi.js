import client from "../api/client";

export const createIdea = async (ideaData) => {
  const response = await client.post("/ideas", ideaData);
  return response.data;
};

export const getMyIdeas = async () => {
  const response = await client.get("/ideas");
  return response.data;
};

export const deleteIdea = async (ideaId) => {
  const response = await client.delete(`/ideas/${ideaId}`);
  return response.data;
};

export const updateIdea = async (ideaId, ideaData) => {
  const response = await client.put(`/ideas/${ideaId}`, ideaData);
  return response.data;
};

export const getIdeaById = async (ideaId) => {
  const response = await client.get(`/ideas/${ideaId}`);
  return response.data;
};

export const enhanceIdea = async (ideaId, data = {}) => {
  const response = await client.post(`/ideas/${ideaId}/enhance`, data);
  return response.data;
};

export const analyzeIdea = async (ideaId) => {
  const response = await client.post(`/ideas/${ideaId}/analyze`);
  return response.data;
};

export const getIdeaAnalysis = async (ideaId) => {
  const response = await client.get(`/ideas/${ideaId}/analysis`);
  return response.data;
};

export const approveAnalysis = async (ideaId, approve = true) => {
  const response = await client.put(`/ideas/${ideaId}/analysis`, { approve });
  return response.data;
};
