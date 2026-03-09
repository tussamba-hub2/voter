import { BrowserRouter, Routes, Route } from "react-router-dom";
import VotePage from "./features/global/VotePage";
import Panel from "./features/admin/Panel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VotePage />} />
        <Route path="/panel" element={<Panel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
