import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
);

// [{id: 1781750191093, email: "pratik222@gmail.com", password: "Pratik@#00", name: "Pratik Pangeni"}]
// 0
// :
// {id: 1781750191093, email: "pratik222@gmail.com", password: "Pratik@#00", name: "Pratik Pangeni"}
