import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MoviesPage from "./pages/MoviesPage";
import TVShowsPage from "./pages/TVShowsPage";
import CartoonPage from "./pages/CartoonPage";
import AnimePage from "./pages/AnimePage";
import SportsPage from "./pages/SportsPage";
import WatchPage from "./pages/WatchPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import PremiumPage from "./pages/PremiumPage";
import AdminPage from "./pages/AdminPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import LiveTVPage from "./pages/LiveTVPage";
import DownloadManagerPage from "./pages/DownloadManagerPage";
import WatchPartyPage from "./pages/WatchPartyPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      // Do NOT cache stream URLs — always fresh
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner
        position="top-right"
        toastOptions={{
          style: {
            background: '#141414',
            border: '1px solid #2a2a2a',
            color: '#fff',
            borderRadius: '14px',
            fontWeight: 600,
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/tvshows" element={<TVShowsPage />} />
          <Route path="/cartoons" element={<CartoonPage />} />
          <Route path="/anime" element={<AnimePage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/live" element={<LiveTVPage />} />
          <Route path="/downloads" element={<DownloadManagerPage />} />
          <Route path="/party" element={<WatchPartyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
