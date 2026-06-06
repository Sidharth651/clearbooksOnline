import { login, signup } from './actions'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ToastHandler } from '@/components/ui/ToastHandler'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <ToastHandler message={params?.error} type="error" />
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">QuickInvoice</h1>
          <p className="text-muted-foreground mt-2">Sign in to your accounting assistant</p>
        </div>

        <Card className="border-border shadow-lg">
          <form>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Enter your email and password to log in or create an account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                  Email
                </label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                  Password
                </label>
                <Input id="password" name="password" type="password" required className="bg-background" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button type="submit" formAction={login} className="w-full">
                Sign In
              </Button>
              <Button type="submit" formAction={signup} variant="outline" className="w-full">
                Create an account
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
