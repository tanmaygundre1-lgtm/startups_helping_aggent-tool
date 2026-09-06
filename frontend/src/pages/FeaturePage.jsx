import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";

const FeaturePage = ({ title, description }) => (
  <AppLayout>
    <div style={{ padding: "var(--space-lg)" }}>
      <h1>{title}</h1>
      <p style={{ color: "var(--muted)", marginBottom: "var(--space-lg)" }}>
        {description}
      </p>
      <Card>
        <h3>Coming soon</h3>
        <p>This feature is scheduled for a future update. Check back later!</p>
      </Card>
    </div>
  </AppLayout>
);

export default FeaturePage;
