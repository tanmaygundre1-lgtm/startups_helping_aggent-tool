import client from "./client";

export const syncUser = async (firebaseUser) => {
  if (!firebaseUser) {
    throw new Error("No authenticated Firebase user is available.");
  }

  const response = await client.post("/users/sync", {
    name: firebaseUser.displayName || "",
    profileImage: firebaseUser.photoURL || "",
  });

  return response.data;
};

export const getProfile = async () => {
  const response = await client.get("/users/profile");
  return response.data;
};

export const updateProfile = async (profile) => {
  const response = await client.put("/users/profile", profile);
  return response.data;
};

export const createFounderProfile = async (profile) => {
  const response = await client.post("/users/profile", profile);
  return response.data;
};

export const createCandidateProfile = async (profile) => {
  const response = await client.post("/users/candidate-profile", profile);
  return response.data;
};