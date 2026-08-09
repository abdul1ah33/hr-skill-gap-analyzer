interface WelcomeProps {
  name: string;
}

function Welcome({ name }: WelcomeProps) {
  return (
    <div>
      <h2>Welcome, {name}!</h2>
      <p>Welcome to the AI HR Assisting App.</p>
    </div>
  );
}

export default Welcome;