import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Positions from "./pages/Positions";
import PositionEdit from "./pages/PositionEdit";
import PositionView from "./pages/PositionView";
import AttributesPage from "./pages/AttributesPage";
import Profile from "./pages/Profile";
import CvPage from "./pages/CvPage";
import SearchResults from "./pages/SearchResults";
import AdminUsers from "./pages/AdminUsers";

function Protected({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && user.role !== "ADMIN" && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="positions" element={<Positions />} />
            <Route path="positions/new" element={<Protected roles={["RECRUITER"]}><PositionEdit /></Protected>} />
            <Route path="positions/:id" element={<PositionView />} />
            <Route path="positions/:id/edit" element={<Protected roles={["RECRUITER"]}><PositionEdit /></Protected>} />
            <Route path="attributes" element={<Protected roles={["RECRUITER"]}><AttributesPage /></Protected>} />
            <Route path="profile/:userId" element={<Protected><Profile /></Protected>} />
            <Route path="cvs/:id" element={<Protected><CvPage /></Protected>} />
            <Route path="search" element={<SearchResults />} />
            <Route path="users" element={<Protected roles={[]}><AdminUsers /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
