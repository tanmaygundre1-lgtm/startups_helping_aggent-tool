import { useState } from "react";
import "./App.css";
import firebase from "./config/firebase-config";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button>google login</button>
    </>
  );
}

export default App;
