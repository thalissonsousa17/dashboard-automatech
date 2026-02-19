// src/components/Header.tsx
import React, { useState } from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowProfileMenu(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 p-5 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Botão de menu (hambúrguer) para telas pequenas */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        
        {/* Adicione o logo ou título aqui para telas maiores, se desejar */}
        

        <div className="flex items-center space-x-2 ml-auto">
          {/* Botão de Notificações */}
          <button className="p-2 rounded-full hover:bg-gray-100 relative transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            {/* Opcional: Adicione a bolha de notificação */}
            {/* <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span> */}
          </button>
          
          {/* Menu de Perfil */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center hover:shadow-lg transition-all"
            >
              <span className="text-white font-medium text-sm">
                {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500">{isAdmin ? 'Administrador' : 'Professor'}</p>
                </div>
                
                <button
                  onClick={() => {
                    navigate('/dashboard/meu-perfil');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <User className="w-4 h-4 mr-2" />
                  Meu Perfil
                </button>
                
                <hr className="my-1" />
                
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  );
};

export default Header;