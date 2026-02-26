import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MfaVerifyProps {
  factorId: string;
  onVerified: () => void;
  onCancel: () => void;
}

const MfaVerify = ({ factorId, onVerified, onCancel }: MfaVerifyProps) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({ title: 'Invalid Code', description: 'Please enter a 6-digit code', variant: 'destructive' });
      return;
    }

    try {
      setVerifying(true);
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      onVerified();
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid code. Please try again.',
        variant: 'destructive',
      });
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="toll-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Shield className="h-8 w-8 text-highway-blue" />
              </div>
            </div>
            <CardTitle className="text-2xl">Two-Factor Verification</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={handleKeyDown}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
                disabled={verifying}
              />
            </div>
            <Button
              onClick={handleVerify}
              disabled={verifying || code.length !== 6}
              className="w-full highway-gradient text-white"
            >
              {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : 'Verify'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={onCancel} disabled={verifying}>
              Cancel & Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MfaVerify;
