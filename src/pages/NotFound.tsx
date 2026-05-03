import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Film } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black mb-2 bg-gradient-to-r from-[#e50914] to-red-800 bg-clip-text text-transparent">404</div>
        <div className="text-6xl mb-6">🎬</div>
        <h1 className="text-white text-2xl font-black mb-3">Scene Not Found</h1>
        <p className="text-gray-500 mb-8">
          The page you're looking for has rolled credits. But there's plenty more to watch!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="flex items-center justify-center gap-2 bg-[#e50914] text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors">
            <Home size={18} /> Back to Home
          </Link>
          <Link to="/search" className="flex items-center justify-center gap-2 bg-gray-800 text-gray-300 font-bold px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors">
            <Search size={18} /> Search Content
          </Link>
          <Link to="/movies" className="flex items-center justify-center gap-2 bg-gray-800 text-gray-300 font-bold px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors">
            <Film size={18} /> Browse Movies
          </Link>
        </div>
      </div>
    </div>
  );
}
