import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { useToast } from "../components/Toast";
import { PageHeader } from "../components/PageHeader";
import { DataTableWrapper } from "../components/DataTableWrapper";
import { EditButton } from "../components/EditButton";
import { DeleteButton } from "../components/DeleteButton";
import { StatusBadge } from "../components/StatusBadge";

interface Strategy {
  id: number;
  name: string;
  active: boolean;
  required_rates: number;
  risk_ratio: number;
  risk_pips: number;
  max_holding_minutes: number;
}

export function StrategiesManagement() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    active: true,
    required_rates: 14,
    risk_ratio: 2.0,
    risk_pips: 10,
    max_holding_minutes: 1440,
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/strategies");
      if (!response.ok) throw new Error("Failed to fetch strategies");
      const data = await response.json();

      // Parse numeric fields to ensure proper types
      const parsedData = data.map((strategy: any) => ({
        ...strategy,
        required_rates: Number(strategy.required_rates),
        risk_ratio: parseFloat(String(strategy.risk_ratio)),
        risk_pips: Number(strategy.risk_pips),
        max_holding_minutes: Number(strategy.max_holding_minutes),
      }));

      setStrategies(parsedData);
    } catch (error) {
      console.error("Error loading strategies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingStrategy
        ? `http://localhost:3000/api/strategies/${editingStrategy.id}`
        : "http://localhost:3000/api/strategies";

      const method = editingStrategy ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          active: formData.active,
          requiredRates: formData.required_rates,
          riskRatio: formData.risk_ratio,
          riskPips: formData.risk_pips,
          maxHoldingMinutes: formData.max_holding_minutes,
        }),
      });

      if (!response.ok) throw new Error("Failed to save strategy");

      await loadStrategies();
      setDialogOpen(false);
      setEditingStrategy(null);
      setFormData({
        name: "",
        active: true,
        required_rates: 14,
        risk_ratio: 2.0,
        risk_pips: 10,
        max_holding_minutes: 1440,
      });
    } catch (error) {
      console.error("Error saving strategy:", error);
      showToast("Failed to save strategy. Please try again.", "error");
    }
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      active: strategy.active,
      required_rates: strategy.required_rates,
      risk_ratio: parseFloat(String(strategy.risk_ratio)) || 2.0,
      risk_pips: strategy.risk_pips,
      max_holding_minutes: strategy.max_holding_minutes,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/strategies/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete strategy");

      await loadStrategies();
    } catch (error) {
      console.error("Error deleting strategy:", error);
      showToast("Failed to delete strategy. Please try again.", "error");
    }
  };

  const openAddDialog = () => {
    setEditingStrategy(null);
    setFormData({
      name: "",
      active: true,
      required_rates: 14,
      risk_ratio: 2.0,
      risk_pips: 10,
      max_holding_minutes: 1440,
    });
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Strategies Management"
            subtitle="Manage trading strategies and their configurations"
          />
          <Button
            onClick={openAddDialog}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Strategy
          </Button>
        </div>
        {/* Strategies Table */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Trading Strategies
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {strategies.length} strateg
                  {strategies.length !== 1 ? "ies" : "y"} configured
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTableWrapper
              data={strategies}
              loading={loading}
              emptyTitle="No strategies found"
              emptyDescription="Add your first trading strategy to get started with signal generation"
            >
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">
                        ID
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Strategy Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Required Rates
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Risk Ratio
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Risk Pips
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Max Holding (min)
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Status
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategies.map((strategy) => (
                      <TableRow
                        key={strategy.id}
                        className="border-gray-200 hover:bg-gray-50"
                      >
                        <TableCell className="font-medium text-gray-900">
                          {strategy.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {strategy.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Trading strategy
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {strategy.required_rates} rates
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono bg-green-50 text-green-700 border-green-200"
                          >
                            {strategy.risk_ratio}:1
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono bg-orange-50 text-orange-700 border-orange-200"
                          >
                            {strategy.risk_pips} pips
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono bg-purple-50 text-purple-700 border-purple-200"
                          >
                            {strategy.max_holding_minutes} min
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge active={strategy.active} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <EditButton onClick={() => handleEdit(strategy)} />
                            <DeleteButton
                              onClick={() => handleDelete(strategy.id)}
                              itemName={`"${strategy.name}"`}
                              itemType="Trading Strategy"
                              additionalWarning="This action cannot be undone and will remove all associated trading opportunities."
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DataTableWrapper>
          </CardContent>
        </Card>
        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogOverlay className="bg-black/40" />
          <DialogContent className="sm:max-w-md bg-white border-gray-200 shadow-xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingStrategy
                  ? "Edit Trading Strategy"
                  : "Add New Trading Strategy"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingStrategy
                  ? "Update the trading strategy settings below. The strategy name cannot be changed as it identifies the trading algorithm."
                  : "Create a new trading strategy for signal generation."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Strategy Name
                  </Label>
                  {editingStrategy ? (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {editingStrategy.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Strategy name cannot be changed as it identifies the
                          trading algorithm
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="RSI Strategy"
                      className="h-11"
                      required
                    />
                  )}
                  {!editingStrategy && (
                    <p className="text-xs text-gray-500">
                      Enter a descriptive name for your trading strategy
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="required_rates"
                    className="text-sm font-medium text-gray-700"
                  >
                    Required Historical Rates
                  </Label>
                  <Input
                    id="required_rates"
                    type="number"
                    value={formData.required_rates}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        required_rates: parseInt(e.target.value) || 14,
                      }))
                    }
                    placeholder="14"
                    className="h-11"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Number of historical rates needed for strategy calculation
                    (default: 14)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="risk_ratio"
                    className="text-sm font-medium text-gray-700"
                  >
                    Risk Ratio (Reward:Risk)
                  </Label>
                  <Input
                    id="risk_ratio"
                    type="number"
                    step="0.1"
                    value={formData.risk_ratio}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        risk_ratio: parseFloat(e.target.value) || 2.0,
                      }))
                    }
                    placeholder="2.0"
                    className="h-11"
                    min="0.1"
                    max="10"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Risk-to-reward ratio for take profit calculation (default:
                    2.0)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="risk_pips"
                    className="text-sm font-medium text-gray-700"
                  >
                    Risk Amount (Pips)
                  </Label>
                  <Input
                    id="risk_pips"
                    type="number"
                    value={formData.risk_pips}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        risk_pips: parseInt(e.target.value) || 10,
                      }))
                    }
                    placeholder="10"
                    className="h-11"
                    min="1"
                    max="100"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Base risk amount in pips for stop loss calculation (default:
                    10)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="max_holding_minutes"
                    className="text-sm font-medium text-gray-700"
                  >
                    Maximum Holding Time (Minutes)
                  </Label>
                  <Input
                    id="max_holding_minutes"
                    type="number"
                    value={formData.max_holding_minutes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_holding_minutes: parseInt(e.target.value) || 1440,
                      }))
                    }
                    placeholder="1440"
                    className="h-11"
                    min="1"
                    max="10080"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Maximum time to hold a position before auto-closing
                    (default: 1440 minutes = 24 hours)
                  </p>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Status
                  </Label>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked: boolean) =>
                          setFormData((prev) => ({ ...prev, active: checked }))
                        }
                        className="data-[state=checked]:bg-green-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge active={formData.active} />
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.active
                            ? "This strategy will be used for signal generation"
                            : "This strategy will be disabled from signal generation"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  {editingStrategy ? "Update Strategy" : "Add Strategy"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
