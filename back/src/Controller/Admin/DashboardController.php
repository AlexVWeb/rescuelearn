<?php

namespace App\Controller\Admin;

use App\Entity\CategoryQuestion;
use App\Entity\LevelQuestion;
use App\Entity\Question;
use App\Entity\QuestionOption;
use App\Entity\Quiz;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class DashboardController extends AbstractDashboardController
{
    #[Route('/admin', name: 'admin')]
    public function index(): Response
    {
        return $this->render('admin/dashboard.html.twig');
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('Symfony Geoloc Admin');
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::linkToDashboard('Dashboard', 'fa fa-home');
        yield MenuItem::linkToCrud('Utilisateurs', 'fa fa-users', User::class);
        
        yield MenuItem::section('Quiz');
        yield MenuItem::linkToCrud('Quiz', 'fa fa-question-circle', Quiz::class);
        yield MenuItem::linkToCrud('Questions', 'fa fa-list', Question::class);
        yield MenuItem::linkToCrud('Options', 'fa fa-check-square', QuestionOption::class);
        
        yield MenuItem::section('Catégories et Niveaux');
        yield MenuItem::linkToCrud('Catégories', 'fa fa-tags', CategoryQuestion::class);
        yield MenuItem::linkToCrud('Niveaux', 'fa fa-layer-group', LevelQuestion::class);
    }
}