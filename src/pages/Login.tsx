import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpg';
import { z } from 'zod';

// Input validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username richiesto').max(50, 'Username troppo lungo'),
  password: z.string().min(1, 'Password richiesta')
});

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate inputs
    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || 'Dati non validi';
      toast.error(errorMessage);
      setIsLoading(false);
      return;
    }

    // Convert username to email format for Supabase Auth
    const email = `${username.toLowerCase().trim()}@asdpicche.local`;
    const result = await login(email, password);

    if (result.success) {
      toast.success('Accesso effettuato!');
      navigate('/loading');
    } else {
      toast.error(result.error || 'Errore di accesso');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-dark p-6">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardHeader className="text-center space-y-4">
          <img 
            src={logo} 
            alt="ASD Picche" 
            className="w-24 h-24 mx-auto rounded-xl shadow-lg"
          />
          <CardTitle className="text-2xl font-bold text-foreground">
            Pagellini Picche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Accesso...' : 'Accedi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
