import client from "../api/client";

const taskPath = (teamId) => `/teams/${teamId}/tasks`;

export const listTeamTasks = async (teamId, params = {}) => {
  const response = await client.get(taskPath(teamId), { params });
  return response.data;
};

export const getTeamTaskSummary = async (teamId) => {
  const response = await client.get(`${taskPath(teamId)}/summary`);
  return response.data;
};

export const downloadTeamTaskTemplate = async (teamId) => {
  const response = await client.get(`${taskPath(teamId)}/template`, {
    responseType: "blob",
  });
  return response.data;
};

export const previewTeamTaskImport = async (teamId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post(
    `${taskPath(teamId)}/import/preview`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

export const commitTeamTaskImport = async (teamId, payload) => {
  const response = await client.post(`${taskPath(teamId)}/import/commit`, payload);
  return response.data;
};

export const undoTeamTaskImport = async (teamId, batchId) => {
  const response = await client.post(`${taskPath(teamId)}/import/${batchId}/undo`);
  return response.data;
};

export const createTeamTask = async (teamId, payload) => {
  const response = await client.post(taskPath(teamId), payload);
  return response.data;
};

export const updateTeamTask = async (teamId, taskId, payload) => {
  const response = await client.patch(`${taskPath(teamId)}/${taskId}`, payload);
  return response.data;
};

export const deleteTeamTask = async (teamId, taskId) => {
  const response = await client.delete(`${taskPath(teamId)}/${taskId}`);
  return response.data;
};
