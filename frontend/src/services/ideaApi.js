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
