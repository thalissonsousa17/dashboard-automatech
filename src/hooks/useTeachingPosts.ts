import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface TeachingPost {
  id: string;
  title: string;
  description: string;
  author: string;
  subject: string;
  grade_level: string;
  created_at: string;
  files: {
    name: string;
    url: string;
    type: 'pdf' | 'ppt' | 'doc' | 'other';
  }[];
  videos: {
    title: string;
    url: string;
    platform: 'youtube' | 'vimeo' | 'other';
  }[];
  images: string[];
  tags: string[];
  likes: number;
  views: number;
}

// Mock data inicial
const initialMockPosts: TeachingPost[] = [
  {
    id: '1',
    title: 'Introdução à Automação Industrial',
    description: 'Material completo sobre os fundamentos da automação industrial, incluindo conceitos básicos, tipos de sensores e atuadores, e aplicações práticas na indústria moderna.',
    author: 'Prof. João Silva',
    subject: 'Automação Industrial',
    grade_level: '3º Ano Técnico',
    created_at: '2024-01-15T10:00:00Z',
    files: [
      { name: 'Slides_Automacao_Industrial.pdf', url: '#', type: 'pdf' },
      { name: 'Exercicios_Praticos.pdf', url: '#', type: 'pdf' }
    ],
    videos: [
      { title: 'Sensores na Indústria 4.0', url: 'https://youtube.com/watch?v=example', platform: 'youtube' }
    ],
    images: [
      'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/159298/gears-cogs-machine-machinery-159298.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    tags: ['Automação', 'Sensores', 'Indústria 4.0'],
    likes: 24,
    views: 156
  },
  {
    id: '2',
    title: 'Programação de CLPs - Ladder',
    description: 'Aula prática sobre programação de Controladores Lógicos Programáveis utilizando linguagem Ladder. Inclui exemplos práticos e exercícios.',
    author: 'Prof. Maria Santos',
    subject: 'Programação Industrial',
    grade_level: '2º Ano Técnico',
    created_at: '2024-01-12T14:30:00Z',
    files: [
      { name: 'Manual_CLP_Ladder.pdf', url: '#', type: 'pdf' },
      { name: 'Exemplos_Programacao.zip', url: '#', type: 'other' }
    ],
    videos: [
      { title: 'CLP na Prática - Programação Ladder', url: 'https://youtube.com/watch?v=example2', platform: 'youtube' }
    ],
    images: [
      'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    tags: ['CLP', 'Ladder', 'Programação'],
    likes: 18,
    views: 89
  },
  {
    id: '3',
    title: 'Internet das Coisas (IoT) na Indústria',
    description: 'Conceitos fundamentais sobre IoT aplicados ao ambiente industrial. Sensores, conectividade e análise de dados em tempo real.',
    author: 'Prof. Carlos Oliveira',
    subject: 'Automação Industrial',
    grade_level: '3º Ano Técnico',
    created_at: '2024-01-08T16:45:00Z',
    files: [
      { name: 'IoT_Industrial_Slides.pdf', url: '#', type: 'pdf' },
      { name: 'Projeto_Sensor_Arduino.zip', url: '#', type: 'other' }
    ],
    videos: [
      { title: 'IoT na Indústria 4.0 - Conceitos Básicos', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', platform: 'youtube' },
      { title: 'Sensores IoT em Ação', url: 'https://www.youtube.com/watch?v=example3', platform: 'youtube' }
    ],
    images: [
      'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    tags: ['IoT', 'Sensores', 'Indústria 4.0', 'Arduino'],
    likes: 32,
    views: 201
  }
];

export const useTeachingPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<TeachingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar posts do Supabase ou localStorage
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback para localStorage
        const savedPosts = localStorage.getItem('teachingPosts');
        if (savedPosts) {
          const parsedPosts = JSON.parse(savedPosts);
          setPosts(parsedPosts);
        } else {
          setPosts(initialMockPosts);
          localStorage.setItem('teachingPosts', JSON.stringify(initialMockPosts));
        }
        return;
      }

      // Se o usuário estiver logado, filtrar por created_by
      let query = supabase
        .from('teaching_posts')
        .select('*');

      if (user) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      setPosts(data || []);
    } catch (err) {
      console.error('Erro ao carregar posts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar posts');
      
      // Fallback para localStorage em caso de erro
      const savedPosts = localStorage.getItem('teachingPosts');
      if (savedPosts) {
        const parsedPosts = JSON.parse(savedPosts);
        setPosts(parsedPosts);
      } else {
        setPosts(initialMockPosts);
      }
    } finally {
      setLoading(false);
    }
  };

  // Salvar posts no localStorage sempre que houver mudanças
  const savePosts = (newPosts: TeachingPost[]) => {
    localStorage.setItem('teachingPosts', JSON.stringify(newPosts));
    setPosts(newPosts);
  };

  const createPost = async (postData: Omit<TeachingPost, 'id' | 'created_at' | 'likes' | 'views'>) => {
    try {
      console.log('Criando post com dados:', postData); // Debug

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback para localStorage
        const newPost: TeachingPost = {
          ...postData,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          likes: 0,
          views: 0
        };
        
        const updatedPosts = [newPost, ...posts];
        savePosts(updatedPosts);
        return newPost;
      }

      const { data, error } = await supabase
        .from('teaching_posts')
        .insert([{
          title: postData.title,
          description: postData.description,
          author: postData.author,
          subject: postData.subject,
          grade_level: postData.grade_level,
          files: postData.files,
          videos: postData.videos,
          images: postData.images,
          tags: postData.tags,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar lista local
      setPosts(prev => [data, ...prev]);
      
      return data;
    } catch (err) {
      console.error('Erro ao criar post:', err); // Debug
      
      // Fallback para localStorage em caso de erro
      const newPost: TeachingPost = {
        ...postData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        likes: 0,
        views: 0
      };
      
      const updatedPosts = [newPost, ...posts];
      savePosts(updatedPosts);
      return newPost;
    }
  };

  const updatePost = async (id: string, updates: Partial<Omit<TeachingPost, 'id' | 'created_at'>>) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback para localStorage
        const updatedPosts = posts.map(post => 
          post.id === id ? { ...post, ...updates } : post
        );
        savePosts(updatedPosts);
        return;
      }

      const { error } = await supabase
        .from('teaching_posts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar lista local
      setPosts(prev => prev.map(post => 
        post.id === id ? { ...post, ...updates } : post
      ));
    } catch (err) {
      console.error('Erro ao atualizar post:', err);
      
      // Fallback para localStorage
      const updatedPosts = posts.map(post => 
        post.id === id ? { ...post, ...updates } : post
      );
      savePosts(updatedPosts);
    }
  };

  const deletePost = async (id: string) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback para localStorage
        const updatedPosts = posts.filter(post => post.id !== id);
        savePosts(updatedPosts);
        return;
      }

      const { error } = await supabase
        .from('teaching_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar lista local
      setPosts(prev => prev.filter(post => post.id !== id));
    } catch (err) {
      console.error('Erro ao deletar post:', err);
      
      // Fallback para localStorage
      const updatedPosts = posts.filter(post => post.id !== id);
      savePosts(updatedPosts);
    }
  };

  const incrementViews = async (id: string) => {
    try {
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback para localStorage
        const updatedPosts = posts.map(post => 
          post.id === id ? { ...post, views: post.views + 1 } : post
        );
        savePosts(updatedPosts);
        return;
      }

      const { error } = await supabase
        .from('teaching_posts')
        .update({ views: posts.find(p => p.id === id)?.views + 1 || 1 })
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar lista local
      setPosts(prev => prev.map(post => 
        post.id === id ? { ...post, views: post.views + 1 } : post
      ));
    } catch (err) {
      console.error('Erro ao incrementar views:', err);
      
      // Fallback para localStorage
      const updatedPosts = posts.map(post => 
        post.id === id ? { ...post, views: post.views + 1 } : post
      );
      savePosts(updatedPosts);
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    fetchPosts,
    incrementViews,
  };
};