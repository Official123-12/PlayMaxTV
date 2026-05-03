export const MOVIE_API_BASE = 'https://movieapi.xcasper.space/api';

export const ADMIN_EMAILS = ['admin@playmax.com.ng', 'damini@playmax.com.ng', 'nicky@playmax.com.ng'];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: 2000,
    period: 'week',
    color: 'from-blue-600 to-blue-800',
    features: [
      'Ad-free streaming',
      'HD quality (720p)',
      '1 device at a time',
      'Offline downloads',
      'Early access content',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 4000,
    period: 'month',
    popular: true,
    color: 'from-[#e50914] to-red-800',
    features: [
      'Ad-free streaming',
      'Full HD & Ultra HD',
      '2 devices simultaneously',
      'Early access content',
      'Offline downloads',
      'Watch party mode',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 8000,
    period: 'year',
    color: 'from-[#f5c518] to-yellow-600',
    features: [
      'Ad-free streaming',
      'Full HD & Ultra HD 4K',
      '4 devices simultaneously',
      'Early access content',
      'Offline downloads',
      'Watch party mode',
      'Multiple profiles',
      'Priority support',
    ],
  },
];

export const PAYMENT_INFO = {
  paypal: 'damibotzinc@gmail.com',
};

export const CATEGORIES = [
  { id: 'movies',  label: 'Movies',    path: '/movies' },
  { id: 'tvshows', label: 'TV Shows',  path: '/tvshows' },
  { id: 'sports',  label: 'Sports',    path: '/sports' },
  { id: 'livetv',  label: 'Live TV',   path: '/live' },
  { id: 'cartoons',label: 'Cartoons',  path: '/cartoons' },
  { id: 'anime',   label: 'Anime',     path: '/anime' },
];

export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Animation',
];

// Paystack live public key
export const PAYSTACK_PUBLIC_KEY = 'pk_live_4fb70e3d0ef7044a6f9b5a2891626f3d4e76da9b';
