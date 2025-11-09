import { useState, useEffect } from "react";
import React from "react";
import { Layout } from "../components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
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
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../components/Toast";
import { PageHeader } from "../components/PageHeader";
import { DataTableWrapper } from "../components/DataTableWrapper";
import { EditButton } from "../components/EditButton";
import { DeleteButton } from "../components/DeleteButton";
import { StatusBadge } from "../components/StatusBadge";

interface Currency {
  id: number;
  code: string;
  active: boolean;
}

interface Pair {
  id: number;
  currencyId: number;
  targetCurrency: string;
  active: boolean;
  currencyCode?: string;
}

export function TradingAssetsManagement() {
  // State for currencies
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  // Expandable state
  const [expandedCurrency, setExpandedCurrency] = useState<number | null>(null);

  // Dialog states
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [pairDialogOpen, setPairDialogOpen] = useState(false);

  // Form states
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingPair, setEditingPair] = useState<Pair | null>(null);

  const [currencyFormData, setCurrencyFormData] = useState({
    code: "",
    active: true,
  });
  const [pairFormData, setPairFormData] = useState({
    currencyId: "",
    targetCurrency: "",
    active: true,
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currenciesResponse, pairsResponse] = await Promise.all([
        fetch("http://localhost:3000/api/currencies"),
        fetch("http://localhost:3000/api/pairs"),
      ]);

      if (!currenciesResponse.ok) throw new Error("Failed to fetch currencies");
      if (!pairsResponse.ok) throw new Error("Failed to fetch pairs");

      const currenciesData = await currenciesResponse.json();
      const pairsData = await pairsResponse.json();

      setCurrencies(currenciesData);
      setPairs(pairsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCurrencies = async () => {
    try {
      setLoadingAvailable(true);
      const response = await fetch(
        "http://localhost:3000/api/currencies/available"
      );
      if (!response.ok) throw new Error("Failed to fetch available currencies");
      const data = await response.json();
      setAvailableCurrencies(Object.keys(data.currencies || {}));
    } catch (error) {
      console.error("Error loading available currencies:", error);
      showToast(
        "Failed to load available currencies from API. Please check your connection and API key.",
        "error"
      );
    } finally {
      setLoadingAvailable(false);
    }
  };

  // Currency handlers
  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCurrency) {
      const exists = currencies.some((c) => c.code === currencyFormData.code);
      if (exists) {
        showToast("Currency already exists in the database.", "error");
        return;
      }
    }

    try {
      const url = editingCurrency
        ? `http://localhost:3000/api/currencies/${editingCurrency.id}`
        : "http://localhost:3000/api/currencies";

      const method = editingCurrency ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currencyFormData),
      });

      if (!response.ok) throw new Error("Failed to save currency");

      await loadData();
      setCurrencyDialogOpen(false);
      setEditingCurrency(null);
      setCurrencyFormData({ code: "", active: true });
      showToast(
        editingCurrency
          ? "Currency updated successfully!"
          : "Currency added successfully!",
        "success"
      );
    } catch (error) {
      console.error("Error saving currency:", error);
      showToast("Failed to save currency. Please try again.", "error");
    }
  };

  const handleCurrencyEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setCurrencyFormData({ code: currency.code, active: currency.active });
    setCurrencyDialogOpen(true);
  };

  const handleCurrencyDelete = async (id: number) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/currencies/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete currency");

      await loadData();
      showToast("Currency deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting currency:", error);
      showToast("Failed to delete currency. Please try again.", "error");
    }
  };

  // Pair handlers
  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPair
        ? `http://localhost:3000/api/pairs/${editingPair.id}`
        : "http://localhost:3000/api/pairs";

      const method = editingPair ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyId: parseInt(pairFormData.currencyId),
          targetCurrency: pairFormData.targetCurrency,
          active: pairFormData.active,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save pair. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          if (response.status === 409) {
            errorMessage = "This currency pair already exists.";
          }
        }
        throw new Error(errorMessage);
      }

      await loadData();
      setPairDialogOpen(false);
      setEditingPair(null);
      setPairFormData({ currencyId: "", targetCurrency: "", active: true });
      showToast(
        editingPair ? "Pair updated successfully!" : "Pair added successfully!",
        "success"
      );
    } catch (error) {
      console.error("Error saving pair:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save pair. Please try again.";
      showToast(errorMessage, "error");
    }
  };

  const handlePairEdit = (pair: Pair) => {
    setEditingPair(pair);
    setPairFormData({
      currencyId: pair.currencyId.toString(),
      targetCurrency: pair.targetCurrency,
      active: pair.active,
    });
    setPairDialogOpen(true);
  };

  const handlePairDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/pairs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json();
          showToast(errorData.error, "error");
          return;
        }
        throw new Error("Failed to delete pair");
      }

      await loadData();
      showToast("Pair deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting pair:", error);
      showToast("Failed to delete pair. Please try again.", "error");
    }
  };

  // Dialog openers
  const openAddCurrencyDialog = () => {
    setEditingCurrency(null);
    setCurrencyFormData({ code: "", active: true });
    loadAvailableCurrencies();
    setCurrencyDialogOpen(true);
  };

  const openAddPairDialogForCurrency = (currency: Currency) => {
    setEditingPair(null);
    setPairFormData({
      currencyId: currency.id.toString(),
      targetCurrency: "",
      active: true,
    });
    loadAvailableCurrencies();
    setPairDialogOpen(true);
  };

  // Helper functions
  const getPairsForCurrency = (currencyId: number) => {
    return pairs.filter((pair) => pair.currencyId === currencyId);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Trading Assets"
            subtitle="Manage currencies and trading pairs"
          />
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={openAddCurrencyDialog}
              variant="outline"
              className="border-blue-300 hover:bg-blue-50 text-blue-700 w-full sm:w-auto"
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
              Add Currency
            </Button>
          </div>
        </div>

        {/* Base Currencies Section */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Base Currencies
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {currencies.length} currencies configured
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTableWrapper
              data={currencies}
              loading={loading}
              emptyTitle="No currencies found"
              emptyDescription="Add your first currency to get started"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900 min-w-[80px]">
                        Code
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 min-w-[80px]">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 min-w-[100px]">
                        Pairs
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-900 min-w-[120px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.map((currency) => {
                      const currencyPairs = getPairsForCurrency(currency.id);
                      const isExpanded = expandedCurrency === currency.id;

                      return (
                        <React.Fragment key={currency.id}>
                          <TableRow
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              setExpandedCurrency(
                                isExpanded ? null : currency.id
                              )
                            }
                          >
                            <TableCell className="font-mono font-semibold text-gray-900">
                              <div className="flex items-center gap-2">
                                <svg
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                                {currency.code}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge active={currency.active} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  {currencyPairs.length} pairs
                                </span>
                                {currencyPairs.length > 0 && (
                                  <div className="flex gap-1">
                                    {currencyPairs.slice(0, 3).map((pair) => (
                                      <span
                                        key={pair.id}
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          pair.active
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {pair.targetCurrency}
                                      </span>
                                    ))}
                                    {currencyPairs.length > 3 && (
                                      <span className="text-xs text-gray-500">
                                        +{currencyPairs.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <div
                                  onClick={(e: React.MouseEvent) =>
                                    e.stopPropagation()
                                  }
                                >
                                  <EditButton
                                    onClick={() => handleCurrencyEdit(currency)}
                                  />
                                </div>
                                <div
                                  onClick={(e: React.MouseEvent) =>
                                    e.stopPropagation()
                                  }
                                >
                                  <DeleteButton
                                    onClick={() =>
                                      handleCurrencyDelete(currency.id)
                                    }
                                    itemName={currency.code}
                                    itemType="Currency"
                                    additionalWarning="This will also deactivate all pairs using this currency."
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expandable Pairs Section */}
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="bg-gray-50 border-t border-gray-200 p-0"
                            >
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  isExpanded
                                    ? "opacity-100"
                                    : "max-h-0 opacity-0"
                                }`}
                                style={{
                                  maxHeight: isExpanded
                                    ? `${96 + 64 * currencyPairs.length}px`
                                    : "0px",
                                }}
                              >
                                <div className="py-4 px-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      {currency.code} Trading Pairs
                                      {currencyPairs.length > 0
                                        ? ` (${currencyPairs.length})`
                                        : ""}
                                    </h4>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        openAddPairDialogForCurrency(currency)
                                      }
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
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
                                      Add Pair
                                    </Button>
                                  </div>

                                  {currencyPairs.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                      <svg
                                        className="w-12 h-12 mx-auto mb-4 text-gray-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                                        />
                                      </svg>
                                      <p className="text-sm">
                                        No pairs configured for {currency.code}
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openAddPairDialogForCurrency(currency)
                                        }
                                        className="mt-2"
                                      >
                                        Create First Pair
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="border-gray-200">
                                              <TableHead className="font-semibold text-gray-900 min-w-[120px]">
                                                Pair
                                              </TableHead>
                                              <TableHead className="font-semibold text-gray-900 min-w-[80px]">
                                                Status
                                              </TableHead>
                                              <TableHead className="text-right font-semibold text-gray-900 min-w-[120px]">
                                                Actions
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {currencyPairs.map((pair) => (
                                              <TableRow
                                                key={pair.id}
                                                className="hover:bg-gray-50"
                                              >
                                                <TableCell>
                                                  <div>
                                                    <div className="font-mono font-semibold text-gray-900 text-sm">
                                                      {pair.currencyCode}/
                                                      {pair.targetCurrency}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      {pair.currencyCode} to{" "}
                                                      {pair.targetCurrency}
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <StatusBadge
                                                    active={pair.active}
                                                  />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  <div className="flex justify-end gap-2">
                                                    <div
                                                      onClick={(
                                                        e: React.MouseEvent
                                                      ) => e.stopPropagation()}
                                                    >
                                                      <EditButton
                                                        onClick={() =>
                                                          handlePairEdit(pair)
                                                        }
                                                      />
                                                    </div>
                                                    <div
                                                      onClick={(
                                                        e: React.MouseEvent
                                                      ) => e.stopPropagation()}
                                                    >
                                                      <DeleteButton
                                                        onClick={() =>
                                                          handlePairDelete(
                                                            pair.id
                                                          )
                                                        }
                                                        itemName={`${pair.currencyCode}/${pair.targetCurrency}`}
                                                        itemType="Currency Pair"
                                                        additionalWarning="This action cannot be undone and will remove all associated trading data."
                                                      />
                                                    </div>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </DataTableWrapper>
          </CardContent>
        </Card>

        {/* Add/Edit Currency Dialog */}
        <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border-gray-200 shadow-xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingCurrency ? "Edit Currency" : "Add New Currency"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingCurrency
                  ? "Update the currency information below."
                  : "Select a currency from the available options."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCurrencySubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="code"
                    className="text-sm font-medium text-gray-700"
                  >
                    Currency Code
                  </Label>
                  {editingCurrency ? (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {editingCurrency.code}
                        </span>
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-gray-900">
                          {editingCurrency.code}
                        </p>
                        <p className="text-xs text-gray-500">
                          Currency code cannot be changed
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={currencyFormData.code}
                      onValueChange={(value) =>
                        setCurrencyFormData((prev) => ({
                          ...prev,
                          code: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Select a currency from the list" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 max-h-60 overflow-y-auto">
                        {loadingAvailable ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Loading currencies...
                          </div>
                        ) : availableCurrencies.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No currencies available
                          </div>
                        ) : (
                          availableCurrencies.map((code) => (
                            <SelectItem
                              key={code}
                              value={code}
                              className="font-mono text-gray-900 hover:bg-gray-100"
                            >
                              {code}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Status
                  </Label>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="active"
                        checked={currencyFormData.active}
                        onCheckedChange={(checked: boolean) =>
                          setCurrencyFormData((prev) => ({
                            ...prev,
                            active: checked,
                          }))
                        }
                        className="data-[state=checked]:bg-green-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge active={currencyFormData.active} />
                        </div>
                        <p className="text-xs text-gray-500">
                          {currencyFormData.active
                            ? "This currency will be available for trading pairs"
                            : "This currency will be hidden from new pairs"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-3 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrencyDialogOpen(false)}
                  className="border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm text-white"
                  disabled={loadingAvailable && !editingCurrency}
                >
                  {editingCurrency ? "Update Currency" : "Add Currency"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Pair Dialog */}
        <Dialog open={pairDialogOpen} onOpenChange={setPairDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border-gray-200 shadow-xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingPair ? "Edit Currency Pair" : "Add New Currency Pair"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingPair
                  ? "You can only change the active/inactive status of this pair. Currency codes cannot be modified."
                  : "Create a new currency pair for trading signals."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePairSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="currencyId"
                    className="text-sm font-medium text-gray-700"
                  >
                    Base Currency{" "}
                    {(editingPair || pairFormData.currencyId) && "(Read-only)"}
                  </Label>
                  <Select
                    value={pairFormData.currencyId}
                    onValueChange={(value: string) =>
                      !editingPair &&
                      !pairFormData.currencyId &&
                      setPairFormData((prev) => ({
                        ...prev,
                        currencyId: value,
                      }))
                    }
                    disabled={!!editingPair || !!pairFormData.currencyId}
                  >
                    <SelectTrigger
                      className={`w-full h-11 ${
                        editingPair || pairFormData.currencyId
                          ? "bg-gray-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          editingPair || pairFormData.currencyId
                            ? "Cannot change base currency"
                            : "Select a currency from the list"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-60 overflow-y-auto">
                      {currencies
                        .filter((c) => c.active)
                        .map((currency) => (
                          <SelectItem
                            key={currency.id}
                            value={currency.id.toString()}
                            className="font-mono text-gray-900 hover:bg-gray-100"
                          >
                            {currency.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {pairFormData.currencyId && (
                    <p className="text-xs text-gray-500">
                      Selected:{" "}
                      {
                        currencies.find(
                          (c) => c.id.toString() === pairFormData.currencyId
                        )?.code
                      }
                      {editingPair && " (cannot be changed)"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="targetCurrency"
                    className="text-sm font-medium text-gray-700"
                  >
                    Target Currency {editingPair && "(Read-only)"}
                  </Label>
                  <Select
                    value={pairFormData.targetCurrency}
                    onValueChange={(value: string) =>
                      !editingPair &&
                      setPairFormData((prev) => ({
                        ...prev,
                        targetCurrency: value,
                      }))
                    }
                    disabled={!!editingPair}
                  >
                    <SelectTrigger
                      className={`w-full h-11 ${
                        editingPair ? "bg-gray-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          editingPair
                            ? "Cannot change target currency when editing"
                            : "Select a currency from the list"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-60 overflow-y-auto">
                      {loadingAvailable ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Loading currencies...
                        </div>
                      ) : availableCurrencies.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No currencies available
                        </div>
                      ) : (
                        availableCurrencies.map((code) => (
                          <SelectItem
                            key={code}
                            value={code}
                            className="font-mono text-gray-900 hover:bg-gray-100"
                          >
                            {code}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {pairFormData.targetCurrency && (
                    <p className="text-xs text-gray-500">
                      Selected: {pairFormData.targetCurrency}
                      {editingPair && " (cannot be changed)"}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Status
                  </Label>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="active"
                        checked={pairFormData.active}
                        onCheckedChange={(checked: boolean) =>
                          setPairFormData((prev) => ({
                            ...prev,
                            active: checked,
                          }))
                        }
                        className="data-[state=checked]:bg-green-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge active={pairFormData.active} />
                        </div>
                        <p className="text-xs text-gray-500">
                          {pairFormData.active
                            ? "This pair will be used for trading signals"
                            : "This pair will be hidden from signal generation"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-3 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPairDialogOpen(false)}
                  className="border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm text-white"
                  disabled={loadingAvailable && !editingPair}
                >
                  {editingPair ? "Update Pair" : "Add Pair"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
