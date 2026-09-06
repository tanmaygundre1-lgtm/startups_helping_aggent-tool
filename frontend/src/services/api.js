import client from "../api/client";
import { syncUser } from "../api/userApi";

export const syncCurrentUser = async (firebaseUser) => {
  return syncUser(firebaseUser);
};

export default client;