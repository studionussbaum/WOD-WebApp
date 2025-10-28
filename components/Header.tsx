import React from 'react';
import { User, USERS } from '../types';
import { UserIcon } from './icons';

interface HeaderProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, setCurrentUser }) => (
  <header className="bg-secondary p-3 flex justify-center items-center gap-2 shadow-md sticky top-0 z-10">
    <UserIcon className="w-6 h-6 text-text-dark" />
    <div className="flex rounded-lg bg-primary p-1">
      {USERS.map(user => (
        <button
          key={user}
          onClick={() => setCurrentUser(user)}
          className={`px-4 py-1 text-sm font-semibold transition-colors rounded-md ${
            currentUser === user
              ? 'bg-accent text-white shadow'
              : 'text-text-dark hover:bg-gray-700'
          }`}
        >
          {user}
        </button>
      ))}
    </div>
  </header>
);

export default Header;
