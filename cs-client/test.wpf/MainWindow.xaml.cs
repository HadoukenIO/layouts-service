using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
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

        public MainWindow()
        {
            InitializeComponent();
            Layouts.WindowLayoutManager.Initialize();

            var helper = new WindowInteropHelper(this);
            helper.EnsureHandle();

            _layoutManager = new Layouts.WindowLayoutManager(helper.Handle);
            _layoutManager.Register();
        }

        private void UndockButton_Click(object sender, RoutedEventArgs e)
        {
            _layoutManager.Ungroup();   
        }

        private void UndockGroup_Click(object sender, RoutedEventArgs e)
        {
            _layoutManager.UngroupAll();
        }
    }
}
