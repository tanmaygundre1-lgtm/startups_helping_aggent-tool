import client from "../api/client";

export const createIdea = async (ideaData) => {
  const response = await client.post("/ideas", ideaData);
  return response.data;
};

export const getMyIdeas = async () => {
  const response = await client.get("/ideas");
  return response.data;
};

export const getIdeaById = async (ideaId) => {
  const response = await client.get(`/ideas/${ideaId}`);
  return response.data;
};
