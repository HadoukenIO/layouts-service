using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Controls;
using Fin = Openfin.Desktop;
using Layouts = OpenFin.Layouts;

namespace test.wpf
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private Layouts.WindowLayoutManager _layoutManager;
        private Layouts.WindowLayoutManager _newLayoutManager;

        private Dictionary<string, Newtonsoft.Json.Linq.JObject> _presets = new Dictionary<string, Newtonsoft.Json.Linq.JObject>();

        public MainWindow()
        {
            InitializeComponent();

            var helper = new WindowInteropHelper(this);
            helper.EnsureHandle();

            // NEW STUFF:
            Layouts.WindowLayoutManager.Initialize();

            _newLayoutManager = new Layouts.WindowLayoutManager(helper.Handle);

            _newLayoutManager.Register();

        }

        private void UndockButton_Click(object sender, RoutedEventArgs e)
        {
            _newLayoutManager.Grouping.Ungroup();   
        }

        private void UndockGroup_Click(object sender, RoutedEventArgs e)
        {
            _newLayoutManager.Grouping.UngroupAll();
        }

        private void CloneWindow_Click(object sender, RoutedEventArgs e)
        {
            new MainWindow().Show();
        }

        private void SavePreset_Click(object sender, RoutedEventArgs e)
        {
            var menuItem = sender as MenuItem;
            var presetName = menuItem.Tag as string;

            var result = _newLayoutManager.Workspace.GenerateWorkspace().Result;
            _presets[presetName] = result;
        }

        private void RecallPreset_Click(object sender, RoutedEventArgs e)
        {
            var menuItem = sender as MenuItem;
            var presetName = menuItem.Tag as string;

            var result = _newLayoutManager.Workspace.Restore(_presets[presetName]);
        }
    }
}
