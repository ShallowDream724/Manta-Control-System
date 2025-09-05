import { useState, useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { GlobalStateProvider } from './contexts/GlobalStateContext';

function App() {
  const [loading, setLoading] = useState(true);

  // 模拟初始化加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <GlobalStateProvider>
      <AppLayout loading={loading}>
        <div></div>
      </AppLayout>
    </GlobalStateProvider>
  );
}

export default App;
